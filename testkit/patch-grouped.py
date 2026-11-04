"""Metadados e defeitos intencionais, em OOXML padrão após autoria Artifact Tool."""
import json,zipfile,xml.etree.ElementTree as E
from pathlib import Path
root=Path(__file__).resolve().parents[1]
spec=json.loads((root/'testkit/agrupados/spec.json').read_text())
S='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
E.register_namespace('',S[1:-1])
books={'budget':'orcamento-agrupado.xlsx','base':'bases-agrupadas.xlsx','comparison':'comparacao-agrupada.xlsx'}
for kind,file in books.items():
 path=root/'testkit/agrupados'/file
 with zipfile.ZipFile(path) as z: entries={n:z.read(n) for n in z.namelist()}
 names=[s.attrib['name'] for s in E.fromstring(entries['xl/workbook.xml']).find(S+'sheets')]
 for g in spec['groups']:
  if not(g['kind']==kind or kind=='comparison' and g['kind']=='comparison-base'):continue
  sp=f'xl/worksheets/sheet{names.index(g["name"])+1}.xml'
  sheet=E.fromstring(entries[sp]);data=sheet.find(S+'sheetData')
  for ref,meta in g['cells'].items():
   ri=ref[1:];row=next(r for r in data if r.attrib['r']==ri)
   cell=next((x for x in row if x.attrib['r']==ref),None)
   if cell is None:cell=E.SubElement(row,S+'c',{'r':ref})
   for child in list(cell):cell.remove(child)
   cell.attrib.pop('t',None);E.SubElement(cell,S+'f').text=meta['formula']
   if meta.get('error'):cell.set('t','e');E.SubElement(cell,S+'v').text=meta['error']
   else:
    val=g['rows'][int(ri)-1][ord(ref[0])-65]
    if val!='':E.SubElement(cell,S+'v').text=str(val)
  for i in g['hiddenRows']:
   row=next((r for r in data if r.attrib['r']==str(i+1)),None)
   if row is not None:row.set('hidden','1')
  for i in g['hiddenColumns']:
   cols=sheet.find(S+'cols')
   for col in list(cols):
    lo,hi=int(col.attrib['min']),int(col.attrib['max'])
    if lo<=i+1<=hi:
     attrs=dict(col.attrib);cols.remove(col)
     for j in range(lo,hi+1):E.SubElement(cols,S+'col',{**attrs,'min':str(j),'max':str(j),**({'hidden':'1'} if j==i+1 else {})})
  entries[sp]=E.tostring(sheet,encoding='utf-8',xml_declaration=True)
 with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED) as z:
  for n,data in entries.items():z.writestr(n,data)
print('Caches, erros e ocultação aplicados aos arquivos agrupados.')
