# One-off: tag sets with the film or show they come from, for the Timeline. Writes tags.json and a review CSV.
import json, re, csv, collections, sys
CAT = '/home/claude/brickcollect/public/catalog.json'
c = json.load(open(CAT)); th = {t[0]: t for t in c['themes']}
def chain(i):
    out = []; g = 0
    while i and i in th and g < 8: out.insert(0, th[i][1]); i = th[i][2]; g += 1
    return out or ['Other']
sets = {n: (name, yr, chain(tid)) for n, name, yr, tid, pcs in c['sets']}
auto = json.load(open('/tmp/sw_auto.json'))
out = collections.defaultdict(dict)   # theme -> {set: [tags]}
why = []
def tag(n, t, how):
    th_ = sets[n][2][0]
    out[th_].setdefault(n, [])
    if t not in out[th_][n]: out[th_][n].append(t); why.append((th_, n, sets[n][0], sets[n][1], t, how))

# ---------- Star Wars: sets whose subtheme isn't already a film or show ----------
SWF = {'Episode I','Episode II','Episode III','Episode IV','Episode V','Episode VI','The Clone Wars','The Bad Batch','Solo','Obi-Wan Kenobi','Andor','Rebels','Rogue One','The Mandalorian','The Book of Boba Fett','Skeleton Crew','The Mandalorian and Grogu','Ahsoka','Resistance','The Force Awakens','The Last Jedi','The Rise of Skywalker','Young Jedi Adventures','Jedi Fallen Order'}
R = [
('Episode I', r"naboo|gungan|podrac|darth maul|\bmaul\b|trade federation|sebulba|watto|qui-gon|theed|\bmtt\b|bongo"),
('Episode II', r"geonosis|kamino|jango|zam wesell|solar sailer|dooku|petranaki"),
('The Clone Wars', r"clone wars|\b501st|captain rex|\brex\b|cad bane|212th|327th|332nd|malevolence|twilight|hondo"),
('Episode III', r"utapau|grievous|mustafar|order 66|arc-170|jedi interceptor|eta-2|battle of coruscant|vader transformation"),
('The Bad Batch', r"bad batch|havoc marauder"),
('Jedi Fallen Order', r"mantis|cal kestis|bd-1|fallen order|survivor"),
('Solo', r"kessel|enfys|mudtrooper|vandor|range trooper"),
('Andor', r"\bandor\b|ferrix|aldhani"),
('Rebels', r"\bthe ghost\b|\bghost\b(?! & phantom ii)|\bphantom\b(?! ii)|ezra|kanan|chopper|lothal"),
('Rogue One', r"scarif|jedha|k-2so|u-wing|krennic|rogue one|eadu|death trooper"),
('Episode IV', r"tatooine|mos eisley|luke'?s landspeeder|sandcrawler|yavin|tantive|death star(?! ii)|trench run|cantina|jawa|lars homestead|tie advanced"),
('Episode V', r"\bhoth\b|snowspeeder|tauntaun|wampa|dagobah|yoda'?s hut|cloud city|bespin|echo base|carbonite|probe droid"),
('Episode VI', r"endor|ewok|jabba|sarlacc|(?<!ezra's )speeder bike|emperor'?s throne|death star ii|rancor|sail barge|b-wing|tie interceptor|(?<!krennic's )imperial shuttle"),
('The Mandalorian', r"mandalorian(?! and grogu)|razor crest|grogu|the child|din djarin|moff gideon|bo-katan|n-1|\bmando\b|dark trooper|nevarro|kuiil"),
('The Book of Boba Fett', r"boba fett'?s throne|book of boba|daimyo|fennec"),
('Skeleton Crew', r"onyx cinder|at attin|skeleton crew"),
('Ahsoka', r"t-6|ghost & phantom ii|thrawn|baylan|shin hati|eye of sion"),
('The Force Awakens', r"jakku|starkiller|rey'?s speeder|bb-8|rathtar|takodana|\bfinn\b"),
('The Last Jedi', r"\bcrait\b|ahch-to|porg|snoke|supremacy|resistance bomber|canto bight|ski speeder"),
('The Rise of Skywalker', r"exegol|sith eternal|pasaana|kijimi|sith trooper|treadspeeder"),
]
R = [(t, re.compile(r, re.I)) for t, r in R]
for n, (name, yr, ch) in sets.items():
    if ch[0] != 'Star Wars': continue
    sub = auto.get(n, ch[1] if len(ch) > 1 else '')
    if sub in SWF or sub == 'The Old Republic': continue
    for t, r in R:
        if r.search(name): tag(n, t, 'name')

# ---------- Harry Potter: by set number ----------
HP = {
 "Philosopher's Stone": "4701 4702 4704 4705 4706 4707 4708 4709 4721 4722 4723 4711 4712 4714 4726 76387 76392 76395 76477 76466 76460 76417",
 'Chamber of Secrets': "4727 4728 4729 4730 4731 4733 4735 4720 4719 75950 76389 76386 75953 76424 76470 HPANGLIA TRUWEASLEYCAR 4736 76434 76441 40695 76433 75968",
 'Prisoner of Azkaban': "4695 4750 4751 4752 4753 4754 4755 4756 4757 4758 75957 KNIGHTBUS 4866 75945 76414 75947 76427 76401 76407 30628 76449 76396 76397 76451 76446",
 'Goblet of Fire': "4762 4766 4767 4768 4768-2 75946 75958 75965 76406 76420 76440",
 'Order of the Phoenix': "5378 75967 76408 76400 76458",
 'Half-Blood Prince': "75969 75980",
 'Deathly Hallows': "76415 76453 76467 40598 76417",
 'The Crimes of Grindelwald': "75951 75952",
}
for t, nums in HP.items():
    for x in nums.split():
        n = x if re.search(r'-\d+$', x) else x + '-1'
        if n in sets: tag(n, t, 'set number')
        else: print('HP missing', n, file=sys.stderr)

# ---------- Marvel (MCU films): by set number ----------
MV = {
 'Captain America: The First Avenger': "76189",
 'Captain Marvel': "76127 77902 CAPTAINMARVEL 30453",
 'Iron Man films': "76006 76007 76008 76190 76320 76344 76327",
 'Thor films': "76084 76088 76289 76207 76208",
 'The Avengers': "30162 30163 30165 4529 4530 4597 6865 6867 6868 6869 76152 76290 76248 76295 76042 76153",
 'Guardians of the Galaxy': "76019 76020 76021 COMCON034 30449 76079 76080 76081 30525 76193 76253 76254 76255 76278 76286 76251 76217 76282 76297 76341 242402",
 'Age of Ultron': "76029 76030 76031 76032 76038 76041 76105 76291 76325",
 'Ant-Man': "76039 75997 76109",
 'Captain America: Civil War': "76047 76050 76051 76067 76314",
 'Black Panther': "30450 76100 76211 76212 76213 76214 76215",
 'Spider-Man (MCU)': "76082 76083 76128 76129 76130 76184 76185 76195 76261 76280",
 'Doctor Strange': "76060 76205",
 'Infinity War and Endgame': "76101 76102 76103 76104 76107 76108 76186 76191 76192 76200 76237 40525 76223 76247 76263 76266 76322 76323 76124 76125 76131",
 'Shang-Chi': "30454 76176 76177",
 'Eternals': "76145 76154 76155 76156",
}
for t, nums in MV.items():
    for x in nums.split():
        n = x if re.search(r'-\d+$', x) else x + '-1'
        if n in sets: tag(n, t, 'set number')
        else: print('Marvel missing', n, file=sys.stderr)

json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False, indent=0)
with open(sys.argv[2], 'w', newline='') as f:
    w = csv.writer(f); w.writerow(['Theme', 'Set', 'Name', 'Year', 'Tag', 'How'])
    for r in sorted(why): w.writerow([r[0], r[1][:-2] if r[1].endswith('-1') else r[1], r[2], r[3], r[4], r[5]])
cnt = collections.Counter((r[0], r[4]) for r in why)
for k, v in sorted(cnt.items()): print(f'{k[0]:20} {k[1]:36} {v}')
print('sets tagged:', sum(len(v) for v in out.values()))
