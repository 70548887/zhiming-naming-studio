import React from 'react';
import type {Candidate2ReportDocument} from '../shared/candidate2-report-api';
import {candidate2ReportSandboxDocument} from './candidate2-report-boundary';
import {Modal} from './Modal';
import './candidate2-report-ui.css';

/** Displays a correlated document returned by the report bridge. Never accepts
 * an arbitrary HTML string, session snapshot or renderer-authored template. */
export function Candidate2ReportPreview({document,onClose}:{document:Readonly<Candidate2ReportDocument>;onClose:()=>void}){
 return <Modal title="已保存方案报告预览" subtitle="预览不等于 PDF 已生成或保存；内容取自报告接口返回的当前保存版本。" onClose={onClose} wide>
  <p className="muted small">传统判断保持未知；人工审阅与原始分析分值分别保留。</p>
  <iframe data-c2-report-preview title="已保存方案报告内容" sandbox="" referrerPolicy="no-referrer" srcDoc={candidate2ReportSandboxDocument(document)} className="c2-report-preview-frame"/>
 </Modal>;
}
