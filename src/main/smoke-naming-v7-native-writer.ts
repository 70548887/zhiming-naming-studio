import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {win32} from 'node:path';

type ArtifactNode = {path:string;identity:string};

// The PowerShell host receives data only through stdin. The complete native
// implementation is compiled in that same process; no helper file is emitted.
const NATIVE_WRITER_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
try {
  $requestText = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String([Console]::In.ReadToEnd()))
  $request = ConvertFrom-Json -InputObject $requestText
  Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32.SafeHandles;

namespace NamingV7Native {
  public sealed class WriteReceipt {
    public string File { get; set; }
    public long Length { get; set; }
    public string Sha256 { get; set; }
  }

  public static class AtomicWriter {
    private const uint DirectoryAccess = 0x00000081; // LIST_DIRECTORY | READ_ATTRIBUTES
    private const uint ShareRead = 1;
    private const uint OpenExisting = 3;
    private const uint CreateNew = 1;
    private const uint BackupAndOpenReparse = 0x02200000;
    private const uint WriteAndDelete = 0x40010000;
    private const uint DirectoryAttribute = 0x10;
    private const uint ReparseAttribute = 0x400;

    [StructLayout(LayoutKind.Sequential)]
    private struct ByHandleInfo {
      public uint Attributes;
      public System.Runtime.InteropServices.ComTypes.FILETIME CreationTime;
      public System.Runtime.InteropServices.ComTypes.FILETIME LastAccessTime;
      public System.Runtime.InteropServices.ComTypes.FILETIME LastWriteTime;
      public uint VolumeSerial;
      public uint SizeHigh;
      public uint SizeLow;
      public uint LinkCount;
      public uint IndexHigh;
      public uint IndexLow;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct RenameLayout {
      public byte ReplaceIfExists;
      public IntPtr RootDirectory;
      public uint FileNameLength;
      public char FileName;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IoStatusBlock {
      public IntPtr Status;
      public UIntPtr Information;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFileW(string name, uint access, uint share,
      IntPtr security, uint disposition, uint flags, IntPtr template);
    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool GetFileInformationByHandle(SafeFileHandle handle, out ByHandleInfo info);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern uint GetFinalPathNameByHandleW(SafeFileHandle handle, StringBuilder name,
      uint length, uint flags);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint GetFileType(SafeFileHandle handle);
    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool WriteFile(SafeFileHandle handle, IntPtr buffer, uint length,
      out uint written, IntPtr overlapped);
    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool FlushFileBuffers(SafeFileHandle handle);
    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetFileInformationByHandle(SafeFileHandle handle, int informationClass,
      IntPtr information, uint size);
    [DllImport("ntdll.dll")]
    private static extern int NtSetInformationFile(SafeFileHandle handle, out IoStatusBlock ioStatus,
      IntPtr information, uint size, int informationClass);
    [DllImport("ntdll.dll")]
    private static extern uint RtlNtStatusToDosError(int status);

    private static Exception Failure(string operation) {
      return new Win32Exception(Marshal.GetLastWin32Error(), operation);
    }

    private static string Canonical(string path) {
      if (path.StartsWith(@"\\?\", StringComparison.Ordinal)) path = path.Substring(4);
      string result = Path.GetFullPath(path);
      if (result.Length > Path.GetPathRoot(result).Length) result = result.TrimEnd('\\');
      return result;
    }

    private static string FinalPath(SafeFileHandle handle) {
      StringBuilder value = new StringBuilder(512);
      uint length = GetFinalPathNameByHandleW(handle, value, (uint)value.Capacity, 0);
      if (length == 0) throw Failure("GetFinalPathNameByHandleW");
      if (length >= value.Capacity) {
        value = new StringBuilder(checked((int)length + 1));
        length = GetFinalPathNameByHandleW(handle, value, (uint)value.Capacity, 0);
        if (length == 0 || length >= value.Capacity) throw Failure("GetFinalPathNameByHandleW");
      }
      return Canonical(value.ToString());
    }

    private static void VerifyDirectory(SafeFileHandle handle, string path, string identity) {
      ByHandleInfo info;
      if (!GetFileInformationByHandle(handle, out info)) throw Failure("GetFileInformationByHandle");
      if (GetFileType(handle) != 1 || (info.Attributes & DirectoryAttribute) == 0 ||
          (info.Attributes & ReparseAttribute) != 0) throw new IOException("Expected an ordinary directory.");
      ulong index = ((ulong)info.IndexHigh << 32) | info.IndexLow;
      string actualIdentity = info.VolumeSerial.ToString(CultureInfo.InvariantCulture) + ":" +
        index.ToString(CultureInfo.InvariantCulture);
      if (index == 0 || !String.Equals(identity, actualIdentity, StringComparison.Ordinal))
        throw new IOException("Directory identity changed: " + path);
      if (!String.Equals(Canonical(path), FinalPath(handle), StringComparison.OrdinalIgnoreCase))
        throw new IOException("Directory final path changed: " + path);
    }

    private static void RenameHeldFile(SafeFileHandle temporary, string destination) {
      // FileRenameInformation with NULL RootDirectory and a basename renames
      // within this held file's existing directory. Supplying an absolute path
      // reopens the parent and conflicts with the directory's sharing lock.
      byte[] name = Encoding.Unicode.GetBytes(Path.GetFileName(destination));
      int nameOffset = Marshal.OffsetOf(typeof(RenameLayout), "FileName").ToInt32();
      int rootOffset = Marshal.OffsetOf(typeof(RenameLayout), "RootDirectory").ToInt32();
      int lengthOffset = Marshal.OffsetOf(typeof(RenameLayout), "FileNameLength").ToInt32();
      int size = checked(nameOffset + name.Length);
      IntPtr information = Marshal.AllocHGlobal(size);
      try {
        Marshal.Copy(new byte[size], 0, information, size);
        // ReplaceIfExists remains false: artifacts are written exactly once.
        Marshal.WriteIntPtr(information, rootOffset, IntPtr.Zero);
        Marshal.WriteInt32(information, lengthOffset, name.Length);
        Marshal.Copy(name, 0, IntPtr.Add(information, nameOffset), name.Length);
        IoStatusBlock ioStatus;
        int status = NtSetInformationFile(temporary, out ioStatus, information, (uint)size, 10);
        if (status != 0)
          throw new Win32Exception(unchecked((int)RtlNtStatusToDosError(status)),
            "NtSetInformationFile(FileRenameInformation), NTSTATUS 0x" + unchecked((uint)status).ToString("x8"));
      } finally { Marshal.FreeHGlobal(information); }
    }

    private static void DeleteHeldFile(SafeFileHandle temporary) {
      IntPtr information = Marshal.AllocHGlobal(1);
      try {
        Marshal.WriteByte(information, 1);
        if (!SetFileInformationByHandle(temporary, 4, information, 1))
          throw Failure("SetFileInformationByHandle(FileDispositionInfo)");
      } finally { Marshal.FreeHGlobal(information); }
    }

    public static WriteReceipt Save(string[] paths, string[] identities, string file, byte[] bytes) {
      if (paths == null || identities == null || paths.Length < 2 || paths.Length != identities.Length || bytes == null)
        throw new ArgumentException("Incomplete writer request.");
      List<SafeFileHandle> directories = new List<SafeFileHandle>();
      SafeFileHandle temporary = null;
      bool renamed = false;
      try {
        for (int index = 0; index < paths.Length; index++) {
          SafeFileHandle directory = CreateFileW(paths[index], DirectoryAccess, ShareRead,
            IntPtr.Zero, OpenExisting, BackupAndOpenReparse, IntPtr.Zero);
          if (directory.IsInvalid) {
            Exception failure = Failure("Lock directory: " + paths[index]);
            directory.Dispose();
            throw failure;
          }
          directories.Add(directory);
          VerifyDirectory(directory, paths[index], identities[index]);
        }
        string parent = Canonical(paths[paths.Length - 1]);
        if (!String.Equals(parent, Canonical(Path.GetDirectoryName(file)), StringComparison.OrdinalIgnoreCase))
          throw new IOException("Artifact is outside the locked output directory.");
        string temporaryPath = Path.Combine(parent, ".naming-v7-" + Guid.NewGuid().ToString("N") + ".tmp");
        temporary = CreateFileW(temporaryPath, WriteAndDelete, 0, IntPtr.Zero, CreateNew, 0x80, IntPtr.Zero);
        if (temporary.IsInvalid) {
          Exception failure = Failure("Create temporary artifact");
          temporary.Dispose(); temporary = null;
          throw failure;
        }

        if (bytes.Length != 0) {
          GCHandle pinned = GCHandle.Alloc(bytes, GCHandleType.Pinned);
          try {
            int offset = 0;
            while (offset < bytes.Length) {
              uint count = (uint)Math.Min(1024 * 1024, bytes.Length - offset);
              uint written;
              if (!WriteFile(temporary, IntPtr.Add(pinned.AddrOfPinnedObject(), offset), count, out written, IntPtr.Zero))
                throw Failure("WriteFile");
              if (written == 0 || written > count) throw new IOException("Invalid native write length.");
              offset = checked(offset + (int)written);
            }
          } finally { pinned.Free(); }
        }
        if (!FlushFileBuffers(temporary)) throw Failure("FlushFileBuffers");
        RenameHeldFile(temporary, file);
        renamed = true;
        string hash;
        using (SHA256 algorithm = SHA256.Create())
          hash = BitConverter.ToString(algorithm.ComputeHash(bytes)).Replace("-", "").ToLowerInvariant();
        return new WriteReceipt { File = file, Length = bytes.LongLength, Sha256 = hash };
      } catch (Exception error) {
        if (temporary != null && !temporary.IsInvalid && !renamed) {
          try { DeleteHeldFile(temporary); }
          catch (Exception cleanup) { throw new IOException("Native write failed and handle cleanup failed: " + cleanup.Message, error); }
        }
        throw;
      } finally {
        if (temporary != null) temporary.Dispose();
        for (int index = directories.Count - 1; index >= 0; index--) directories[index].Dispose();
      }
    }
  }
}
'@ | Out-Null
  $nodePaths = @($request.nodes | ForEach-Object { [string]$_.path })
  $nodeIdentities = @($request.nodes | ForEach-Object { [string]$_.identity })
  $receipt = [NamingV7Native.AtomicWriter]::Save([string[]]$nodePaths, [string[]]$nodeIdentities, [string]$request.file, [Convert]::FromBase64String([string]$request.contentBase64))
  [Console]::Out.Write((ConvertTo-Json -Compress -InputObject @{file=$receipt.File;length=$receipt.Length;sha256=$receipt.Sha256}))
} catch {
  [Console]::Error.WriteLine('Naming v7 native writer: ' + $_.Exception.Message)
  exit 1
}
`;

function requireWriter(condition:unknown,message:string):asserts condition {
  if(!condition)throw new Error('Naming v7 native writer: '+message);
}

function canonicalLocalPath(value:string,rootAllowed:boolean):string {
  requireWriter(typeof value==='string'&&/^[A-Za-z]:\\/.test(value)&&value===value.trim(),'expected a local drive absolute path');
  const root=win32.parse(value).root;
  if(rootAllowed&&value===root)return value;
  const parts=value.slice(root.length).split('\\');
  requireWriter(parts.length>0&&parts.every(part=>part!==''&&part!=='.'&&part!=='..'&&!/[. ]$/.test(part)&&!/[<>:"|?*\x00-\x1f/]/.test(part)&&!/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part)),'path contains a nonordinary component');
  requireWriter(win32.normalize(value)===value&&value!==root,'expected a normalized path below the drive root');
  return value;
}

/** Save once while the full verified output-directory chain remains locked. */
export function nativeWriteNamingV7Artifact(nodes:ArtifactNode[],file:string,bytes:Uint8Array):void {
  requireWriter(process.platform==='win32','Windows is required');
  requireWriter(Array.isArray(nodes)&&nodes.length>=2,'a complete root-to-output ticket is required');
  const snapshot=nodes.map(node=>{
    requireWriter(!!node&&typeof node==='object'&&typeof node.identity==='string'&&/^(0|[1-9]\d*):[1-9]\d*$/.test(node.identity),'invalid directory identity');
    const [volume,index]=node.identity.split(':').map(value=>BigInt(value));
    requireWriter(volume<=0xffffffffn&&index<=0xffffffffffffffffn,'directory identity is out of range');
    return{path:canonicalLocalPath(node.path,true),identity:node.identity};
  });
  requireWriter(snapshot[0].path===win32.parse(snapshot[0].path).root,'ticket must start at the drive root');
  for(let index=1;index<snapshot.length;index++)requireWriter(win32.dirname(snapshot[index].path).toLowerCase()===snapshot[index-1].path.toLowerCase()&&snapshot[index].path.toLowerCase()!==snapshot[index-1].path.toLowerCase(),'ticket has a missing, duplicate, or reordered directory');
  const destination=canonicalLocalPath(file,false),parent=snapshot[snapshot.length-1].path;
  requireWriter(win32.dirname(destination).toLowerCase()===parent.toLowerCase()&&!win32.basename(destination).includes('..'),'artifact must be an ordinary direct child of the output directory');
  requireWriter(bytes instanceof Uint8Array,'bytes must be a Uint8Array');
  const content=Buffer.from(bytes),expectedSha=createHash('sha256').update(content).digest('hex');
  const systemRoot=canonicalLocalPath(process.env.SystemRoot??'',false);
  const executable=win32.join(systemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe');
  const input=Buffer.from(JSON.stringify({nodes:snapshot,file:destination,contentBase64:content.toString('base64')}),'utf8').toString('base64');
  let output:string;
  try {
    output=execFileSync(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',NATIVE_WRITER_SCRIPT],{input,encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:1024*1024});
  } catch(error) {
    const detail=error as Error&{stderr?:string|Buffer};
    throw new Error('Naming v7 native writer failed: '+String(detail.stderr??detail.message).trim().slice(0,8192),{cause:error});
  }
  let receipt:unknown;
  try{receipt=JSON.parse(output.replace(/^\uFEFF/,'').trim());}catch{throw new Error('Naming v7 native writer: invalid native receipt');}
  requireWriter(!!receipt&&typeof receipt==='object','missing native receipt');
  const record=receipt as Record<string,unknown>;
  requireWriter(record.file===destination&&record.length===content.length&&record.sha256===expectedSha,'native receipt differs from the requested artifact');
}
