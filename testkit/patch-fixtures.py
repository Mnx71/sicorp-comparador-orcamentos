"""Inject intentional workbook defects and visibility metadata after artifact authoring.

Uses only OOXML + zipfile. Does not calculate expectations or invoke SICORP.
"""
import json,zipfile,xml.etree.ElementTree as E
from pathlib import Path
root=Path(__file__).resolve().parents[1]
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
S='{'+ns['s']+'}'
E.register_namespace('',ns['s'])
cases=json.loads((root/'testkit/cases.json').read_text())
for kind in ['budget','base','comparison']:
 path=root/f'testkit/fixtures/{kind}.xlsx'
 with zipfile.ZipFile(path) as z: entries={name:z.read(name) for name in z.namelist()}
 workbook=E.fromstring(entries['xl/workbook.xml'])
 names=[s.attrib['name'] for s in workbook.find(S+'sheets')]
 for c in [x for x in cases if x['kind']==kind]:
  sheetpath=f'xl/worksheets/sheet{names.index(c["id"])+1}.xml'
  sheet=E.fromstring(entries[sheetpath]);data=sheet.find(S+'sheetData')
  for ref,meta in c.get('cells',{}).items():
   ri=ref[1:];row=next((r for r in data if r.attrib['r']==ri),None)
   if row is None: row=E.SubElement(data,S+'row',{'r':ri})
   cell=next((x for x in row if x.attrib['r']==ref),None)
   if cell is None: cell=E.SubElement(row,S+'c',{'r':ref})
   for child in list(cell): cell.remove(child)
   cell.attrib.pop('t',None)
   E.SubElement(cell,S+'f').text=meta['formula']
   if meta.get('error'):
    cell.set('t','e');E.SubElement(cell,S+'v').text=meta['error']
   else:
    val=c['rows'][int(ri)-1][ord(ref[0])-65]
    if val!='': E.SubElement(cell,S+'v').text=str(val)
  for i in c.get('hiddenRows',[]):
   row=next((r for r in data if r.attrib['r']==str(i+1)),None)
   if row is not None: row.set('hidden','1')
  for i in c.get('hiddenColumns',[]):
   cols=sheet.find(S+'cols')
   if cols is None: cols=E.SubElement(sheet,S+'cols')
   for col in list(cols):
    lo,hi=int(col.attrib['min']),int(col.attrib['max'])
    if lo<=i+1<=hi:
     attrs=dict(col.attrib);cols.remove(col)
     for j in range(lo,hi+1): E.SubElement(cols,S+'col',{**attrs,'min':str(j),'max':str(j),**({'hidden':'1'} if j==i+1 else {})})
  entries[sheetpath]=E.tostring(sheet,encoding='utf-8',xml_declaration=True)
 with zipfile.ZipFile(path,'w',compression=zipfile.ZIP_DEFLATED) as z:
  for name,data in entries.items(): z.writestr(name,data)
print('Metadados de teste aplicados aos 3 workbooks.')
