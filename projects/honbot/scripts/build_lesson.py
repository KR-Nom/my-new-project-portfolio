'''장현진 · 2026-09-28
원본 저작 미적분 미니 강의 영상·음성·자막 생성.
실행(macOS): python -m pip install pillow imageio-ffmpeg && python scripts/build_lesson.py
기존 교수 영상이나 이미지 대신 자체 제작 도표와 macOS 한국어 음성을 사용한다.
'''
import json
import os
from array import array
from pathlib import Path
import shutil
import subprocess
import tempfile

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / 'media'
FONT = os.environ.get('HONBOT_FONT', '/System/Library/Fonts/AppleSDGothicNeo.ttc')
GREEN, INK, WHITE, MINT = '#103F39', '#082A27', '#F0F7EF', '#B8E7CA'
SPEECH = [
    '함수 에프 엑스가 엑스 제곱일 때, 엑스가 일에서 삼으로 변하면 평균 변화율은 사입니다. 두 점을 잇는 직선의 기울기죠.',
    '두 점의 간격을 아주 작게 줄이면 한 점에서의 순간 변화율을 구할 수 있습니다. 이것이 미분이며 접선의 기울기를 뜻합니다.',
    '엑스 제곱의 도함수는 이 엑스입니다. 따라서 엑스가 이일 때 미분 계수는 사입니다. 도함수는 함수, 미분 계수는 특정 점의 값입니다.',
    '점 이 콤마 사에서 기울기가 사인 접선은 와이는 사 엑스 빼기 사입니다. 이 접선으로 가까운 구간에서 함수의 변화를 근사할 수 있습니다.',
]
FORMULAS = [
    ['f(x) = x²', '평균변화율 = (9 − 1) / (3 − 1)', '= 4'],
    ['평균변화율 → 순간변화율', 'f′(x) = 2x', '간격 h → 0'],
    ['f′(x) = 2x', 'f′(2) = 2 × 2', '= 4'],
    ['y − 4 = 4(x − 2)', 'y = 4x − 4', 'Δx = 0.01 → Δy ≈ 0.04'],
]


def write_subtitles():
    def stamp(seconds):
        milliseconds = round(seconds * 1000)
        return f'{milliseconds//3600000:02}:{milliseconds//60000%60:02}:{milliseconds//1000%60:02}.{milliseconds%1000:03}'
    cues = []
    for index, speech in enumerate(SPEECH):
        sentences = [sentence.strip() + '.' for sentence in speech.split('.') if sentence.strip()]
        for part, sentence in enumerate(sentences):
            start = index * 15 + part * 15 / len(sentences)
            end = index * 15 + (part + 1) * 15 / len(sentences)
            cues.append(f'{stamp(start)} --> {stamp(end)} line:72% position:50% size:90% align:center\n{sentence}')
    (MEDIA/'calculus.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(cues)+'\n', encoding='utf-8')


def font(size):
    return ImageFont.truetype(FONT, size)


def frame(index, segment):
    canvas = Image.new('RGB', (1280, 720), GREEN)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1280, 65), fill=INK)
    draw.text((48, 20), 'HONBOT  /  미분의 의미와 순간변화율', font=font(23), fill=WHITE)
    draw.text((1090, 22), f'LESSON 0{index+1}', font=font(18), fill=MINT)
    draw.text((62, 112), f'0{index+1}  {segment["title"]}', font=font(32), fill=MINT)
    for n, formula in enumerate(FORMULAS[index]):
        draw.text((65, 236+n*88), formula, font=font(37 if len(formula) < 24 else 28), fill=WHITE)
    # Plot f(x)=x² and its secant or tangent in real coordinate space.
    def point(x, y):
        return 770+x*104, 566-y*39
    for x in range(4):
        a, b = point(x, 0), point(x, 10)
        draw.line((a,b), fill='#28534D', width=1)
        draw.text((a[0]-5,a[1]+12), str(x), font=font(17), fill=MINT)
    for y in range(0, 11, 2):
        draw.line((point(0,y),point(3.5,y)),fill='#28534D',width=1)
    draw.line((point(0,0),point(3.6,0)),fill=WHITE,width=2)
    draw.line((point(0,0),point(0,10.5)),fill=WHITE,width=2)
    curve = [point(i/100, (i/100)**2) for i in range(317)]
    draw.line(curve,fill='#F9D785',width=4)
    draw.text((1110,176),'f(x)=x²',font=font(23),fill='#F9D785')
    line = (point(.85,.4), point(3.25,10)) if index == 0 else (point(1,0),point(3.5,10))
    draw.line(line,fill=MINT,width=3)
    dots = [(1,1),(3,9)] if index == 0 else [(2,4)]
    for x,y in dots:
        px,py=point(x,y)
        draw.ellipse((px-7,py-7,px+7,py+7),fill=WHITE)
        draw.text((px+14,py-28),f'({x}, {y})',font=font(22),fill=WHITE)
    draw.text((65,641),'지금 이해되지 않는 부분은, 재생 시점과 함께 질문하세요.',font=font(22),fill=MINT)
    draw.text((970,644),'직접 제작한 예제 강의 · 60초',font=font(17),fill=MINT)
    return canvas


def main():
    if not shutil.which('say') or not Path(FONT).exists():
        raise SystemExit('재생성은 macOS say와 한국어 폰트가 필요합니다. 포함된 mp4는 모든 OS에서 재생할 수 있습니다.')
    MEDIA.mkdir(exist_ok=True)
    segments = json.loads((ROOT/'content/lectures.json').read_text(encoding='utf-8'))[0]['segments']
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    with tempfile.TemporaryDirectory(prefix='honbot-lesson-') as directory:
        temp = Path(directory)
        for i, segment in enumerate(segments):
            slide = frame(i, segment)
            slide.save(temp/f'{i}.png')
            if i == 2:
                slide.save(MEDIA/'poster.png')
            subprocess.run(['say','-v','Yuna','-r','210','-o',str(temp/f'{i}.aiff'),SPEECH[i]],check=True)
            audio = subprocess.run([ffmpeg,'-v','error','-i',str(temp/f'{i}.aiff'),'-f','f32le','-ac','1','-ar','22050','-'],check=True,capture_output=True).stdout
            samples = array('f', audio)
            if len(samples) < 44100 or max(abs(value) for value in samples) < .001:
                raise RuntimeError('음성 생성 결과가 비어 있습니다. macOS 음성 서비스 접근이 가능한 터미널에서 다시 실행하세요.')
            if len(samples) / 22050 > 14.8:
                raise RuntimeError('내레이션이 15초 구간보다 깁니다. 문장 또는 말하기 속도를 조정하세요.')
            subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-loop','1','-i',str(temp/f'{i}.png'),'-i',str(temp/f'{i}.aiff'),
                            '-t','15','-vf','fps=24,format=yuv420p','-af','apad','-c:v','libx264','-preset','fast','-crf','22',
                            '-c:a','aac','-b:a','96k',str(temp/f'{i}.mp4')],check=True)
        manifest = temp/'concat.txt'
        manifest.write_text(''.join(f"file '{temp}/{i}.mp4'\n" for i in range(4)))
        subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(manifest),'-c','copy','-movflags','+faststart',str(MEDIA/'calculus.mp4')],check=True)
    write_subtitles()
    print(f'Created {MEDIA / "calculus.mp4"} ({(MEDIA/"calculus.mp4").stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
