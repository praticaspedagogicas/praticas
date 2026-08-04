from pathlib import Path
import json,re,sys

root=Path('.')
cbl=(root/'CBL.html').read_text(encoding='utf-8')
m=re.search(r'window\.CBL_COURSES_BY_UNIT\s*=\s*(\{.*?\});',cbl,re.S)
if not m:
    raise SystemExit('Mapa de cursos do CBL não encontrado')
course_map=json.loads(m.group(1))
expected={'IADE':32,'IPAM Lisboa':12,'IPAM Porto':16,'FCS':6,'FCST':28}
if {k:len(v) for k,v in course_map.items()}!=expected:
    raise SystemExit('Contagens do mapa de cursos inesperadas')
if len(set(sum(course_map.values(),[])))!=85:
    raise SystemExit('Total de cursos inesperado')
map_json=json.dumps(course_map,ensure_ascii=False,separators=(',',':'))
css=(root/'.rbl-course-update/style.css').read_text(encoding='utf-8').strip()
js=(root/'.rbl-course-update/script.template.js').read_text(encoding='utf-8').replace('__MAP__',map_json).strip()
style_block='<style id="rbl-course-filter-by-unit-v2-css">\n'+css+'\n</style>\n'
script_block='<script id="rbl-course-filter-by-unit-v2">\n'+js+'\n</script>\n'
for name,mode in [('RBL.html','normal'),('RBL_Teste.html','teste')]:
    p=root/name
    text=p.read_text(encoding='utf-8')
    if f'data-rbl-template-mode="{mode}"' not in text:
        raise SystemExit(f'Modo interno incorreto em {name}')
    text=re.sub(r'<style id="rbl-course-filter-by-unit-v2-css">.*?</style>\s*','',text,flags=re.S)
    text=re.sub(r'<script id="rbl-course-filter-by-unit-v2">.*?</script>\s*','',text,flags=re.S)
    text=text.replace('Selecione um curso na lista. Para adicionar mais cursos, repita a seleção.','Abra a lista para selecionar. Pode também escrever para pesquisar.')
    text=text.replace('Digite para procurar cursos','Selecione ou pesquise um curso')
    if '</head>' not in text or '</body>' not in text:
        raise SystemExit(f'Estrutura HTML inválida em {name}')
    text=text.replace('</head>',style_block+'</head>',1)
    text=text.replace('</body>',script_block+'</body>',1)
    for marker in ['rbl-autosave-resiliente-v5','window.RBL_COURSES_BY_UNIT','Selecione ou pesquise um curso','Abra a lista para selecionar. Pode também escrever para pesquisar.']:
        if marker not in text:
            raise SystemExit(f'Marcador ausente em {name}: {marker}')
    p.write_text(text,encoding='utf-8')
    print(name,len(text))
