from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root=Path(__file__).resolve().parent.parent
out=root/'assets';out.mkdir(exist_ok=True)
im=Image.new('RGBA',(512,512),(0,0,0,0))
d=ImageDraw.Draw(im)
d.rounded_rectangle((8,8,504,504),radius=110,fill='#254c40')
d.rounded_rectangle((49,49,463,463),radius=75,outline='#c3a66e',width=6)
font=ImageFont.truetype('C:/Windows/Fonts/simsun.ttc',310)
box=d.textbbox((0,0),'名',font=font)
d.text(((512-box[2]+box[0])/2,220-(box[3]-box[1])/2-box[1]),'名',font=font,fill='#f5f1e5')
d.line((193,414,319,414),fill='#c3a66e',width=7)
im.save(out/'icon.png')
im.save(out/'icon.ico',sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
