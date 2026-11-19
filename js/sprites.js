'use strict';
/* =========================================================
 *  sprites.js : hand-authored pixel art + procedural tiles
 *  Every sprite is a string grid; palettes map chars→colors.
 *  An outline + white flash silhouette are generated.
 * ========================================================= */
G.Spr = {};
const OUTLINE = '#0b0a12';

/* ---------------- creature art (16x16) ---------------- */
const ART = {};

ART.player = [
  '...........gG...',
  '......Hh..gGGg..',
  '.....HHh...gg...',
  '.....HHHh...w...',
  '....HHHHhh..w...',
  '...bbbbbbbb.w...',
  '..hhhhhhhhhhw...',
  '....sesses..w...',
  '....ssssss.sw...',
  '...RRllllRRRw...',
  '..RRRRllRRRrw...',
  '..RRRRllRRrrw...',
  '..rRRRllRRRrw...',
  '.rRRRRllRRRRw...',
  '.rrrrrrrrrrrw...',
  '...kk...kk..w...',
];

ART.rat = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..pp............',
  '.pap..aaaa......',
  '.aaaaaabbaa.....',
  'aeaaaabbbbaa....',
  'aaaaaaaaaaaa..c.',
  '.naaacaaaacac.c.',
  '..cc.c...c.cccc.',
  '................',
  '................',
];

ART.slime = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '......aaaa......',
  '....aabbbaaa....',
  '...abddbbaaaa...',
  '..abdbbbaaaaac..',
  '..abbaaaaaaaac..',
  '..aaaeaaaeaaac..',
  '.caaaeaaaeaaacc.',
  '.caaaaaaaaaaacc.',
  '.ccaaaaaaaaaccc.',
  '..cccccccccccc..',
  '................',
];

ART.bat = [
  '................',
  '................',
  '................',
  '................',
  '.c............c.',
  '.cc....aa....cc.',
  '.cac..aaaa..cac.',
  'caaac.aeea.caaac',
  'caaaacaaaacaaaac',
  'caa.caaaaaac.aac',
  'ca...caaaac...ac',
  'c.....cffc.....c',
  '................',
  '................',
  '................',
  '................',
];

ART.skeleton = [
  '................',
  '.....bbbbb......',
  '....bbaaaab.....',
  '....baeaeac.....',
  '....baaaaac.....',
  '.....cacac......',
  '......aaa....w..',
  '....aacacaa.w...',
  '...a.acac..aw...',
  '...a.acac...a...',
  '..c...aaa.......',
  '......a.a.......',
  '.....aa.aa......',
  '.....a...a......',
  '....cc...cc.....',
  '................',
];

ART.archer = [
  '................',
  '.....bbbbb...w..',
  '....bbaaaab..wt.',
  '....baeaeac..w.t',
  '....baaaaac..w.t',
  '.....cacac...w.t',
  '......aaa....w.t',
  '....aacacaaaaw.t',
  '...a.acac....w.t',
  '...a.acac....w.t',
  '..c...aaa....wt.',
  '......a.a....w..',
  '.....aa.aa......',
  '.....a...a......',
  '....cc...cc.....',
  '................',
];

ART.spider = [
  '................',
  '................',
  '................',
  '......bbb.......',
  '.....bbdbb......',
  '..c..bbbbbb..c..',
  '.c.c.caaaac.c.c.',
  'c...caeaeaac...c',
  '...caaaaaaaac...',
  '..c.caaaaaac.c..',
  '.c..c.cccc.c..c.',
  'c..c........c..c',
  '..c..........c..',
  '................',
  '................',
  '................',
];

ART.frostwisp = [
  '................',
  '.......d........',
  '......dbd.......',
  '.....dbbbd..d...',
  '....dbbbbbd.....',
  '...abbbbbbba....',
  '...abeebeeba....',
  '...abbbbbbba....',
  '...abbbccbba....',
  '....abbbbba.....',
  '....aabbbaa.....',
  '.....aabaa......',
  '......aaa.......',
  '..d....a........',
  '.......a....d...',
  '................',
];

ART.golem = [
  '................',
  '.....cccccc.....',
  '....caaaaaac....',
  '....caeaaeac....',
  '...ccaaaaaacc...',
  '..caaccccccaac..',
  '.cabaaaaaaaabac.',
  '.cabaammaaaabac.',
  '.cabaaaaaaaabac.',
  '.caaccaaaaccaac.',
  '.cccacaaaacaccc.',
  '....caaaaaac....',
  '....caaccaac....',
  '...caac..caac...',
  '...cccc..cccc...',
  '................',
];

ART.goblin = [
  '................',
  '................',
  '....gg....gg....',
  '....gaaaaaag....',
  '.....aeaaea.....',
  '.....aaaaaa.....',
  '......annb...w..',
  '....llllllll.w..',
  '...aldddddla.w..',
  '...aldddddlaaw..',
  '...a.lllll...w..',
  '.....dd.dd......',
  '.....dd.dd......',
  '.....aa.aa......',
  '....cc...cc.....',
  '................',
];

ART.mimic = [
  '................',
  '................',
  '................',
  '..wwwwwwwwwwww..',
  '.wbbbbbbbbbbbbw.',
  '.wbggbbbbbbggbw.',
  '.wwwwwwwwwwwwww.',
  '.wtrtrtrtrtrtrw.',
  '.wrrrrrrrrrrrrw.',
  '.wrrrrppprrrrrw.',
  '.wtrtrtptrtrtrw.',
  '.wwwwwwwwwwwwww.',
  '.wbbbbbggbbbbbw.',
  '.wbbbbbbbbbbbbw.',
  '..wwwwwwwwwwww..',
  '................',
];

ART.chest = [
  '................',
  '................',
  '................',
  '................',
  '...wwwwwwwwww...',
  '..wbbbbbbbbbbw..',
  '..wbggbbbbggbw..',
  '..wwwwwwwwwwww..',
  '..wbbbbggbbbbw..',
  '..wbbbbgybbbbw..',
  '..wbbbbbbbbbbw..',
  '..wbggbbbbggbw..',
  '..wwwwwwwwwwww..',
  '................',
  '................',
  '................',
];

ART.chestOpen = [
  '................',
  '................',
  '...wwwwwwwwww...',
  '..wbbbbbbbbbbw..',
  '..wbggbbbbggbw..',
  '..wwwwwwwwwwww..',
  '..wkkkkkkkkkkw..',
  '..wwwwwwwwwwww..',
  '..wbbbbggbbbbw..',
  '..wbbbbgybbbbw..',
  '..wbbbbbbbbbbw..',
  '..wbggbbbbggbw..',
  '..wwwwwwwwwwww..',
  '................',
  '................',
  '................',
];

ART.imp = [
  '................',
  '...h........h...',
  '...hh......hh...',
  '....haaaaaah....',
  '....aaeaaeaa....',
  'w...aaaaaaaa...w',
  'ww...annnna...ww',
  'www..aaaaaa..www',
  '.wwwaabbbbaawww.',
  '..wwaabbbbaaww..',
  '....aaaaaaaa....',
  '.....aa..aa.....',
  '.....a....a..t..',
  '....cc....cc.t..',
  '.............tt.',
  '................',
];

ART.hound = [
  '................',
  '................',
  '................',
  '..ff............',
  '.ffff...........',
  'ffaaaf..........',
  'faeaaff.ffff....',
  'aaaaaafffffff...',
  'nnaaaaaaaaaaaf..',
  '..aaaaaaaaaaaaf.',
  '...aaaaaaaaaa.ff',
  '...ac.ac.ac.ac..',
  '...ac.ac.ac.ac..',
  '..cc.cc.cc.cc...',
  '................',
  '................',
];

ART.darkmage = [
  '.......h........',
  '......hhh.......',
  '.....hhhhh......',
  '....hhhhhhh.....',
  '....hheeehh..o..',
  '....hhhhhhh.oOo.',
  '...rrhhhhhrr.o..',
  '..rrrrlllrrrrw..',
  '..rrrrrlrrrrrw..',
  '..rrrrrlrrrrrw..',
  '..rrrrrlrrrrrw..',
  '.rrrrrrlrrrrrrw.',
  '.rrrrrrlrrrrrrw.',
  '.rrrrrrrrrrrrrw.',
  '..rrrrrrrrrrr.w.',
  '................',
];

ART.voideye = [
  '................',
  '.....aaaaaa.....',
  '...aabbbbbbaa...',
  '..abbbwwwwbbba..',
  '.abbwwwwwwwwbba.',
  '.abwwwppppwwwba.',
  '.abwwppeeppwwba.',
  '.abwwppeeppwwba.',
  '.abwwwppppwwwba.',
  '.abbwwwwwwwwbba.',
  '..abbbwwwwbbba..',
  '...aabbbbbbaa...',
  '...t.aaaaaa.t...',
  '..t..t.t.t...t..',
  '.t..t..t..t...t.',
  '......t....t....',
];

ART.shadowknight = [
  '.......pp.......',
  '......pp........',
  '.....aaaaa......',
  '....abbbbba.....',
  '....aeeeeea.....',
  '....abbbbba.....',
  '..aaaaaaaaaaa.s.',
  '.abbbabbbabbbas.',
  '.abaaabbbaaabas.',
  '.aa.abbbbba.aas.',
  '.cc.abbbbba.ccs.',
  '....aaaaaaa..h..',
  '....aaa.aaa.....',
  '....ab...ab.....',
  '...aac...aac....',
  '................',
];

ART.wraith = [
  '................',
  '.....aaaaa......',
  '....abbbbba.....',
  '...abbbbbbba....',
  '...abeebeeba....',
  '...abbbbbbba....',
  '..aabbbccbbaa...',
  '.abbbbbbbbbbba..',
  'ab.abbbbbbba.ba.',
  'a..abbbbbbba..a.',
  '...abbbbbbbba...',
  '...abbbbbbbbba..',
  '..aab.abba.bba..',
  '..a...a..a...a..',
  '.a...a....a...a.',
  '................',
];

ART.shard = [
  '................',
  '................',
  '................',
  '.......d........',
  '......dbd.......',
  '.....dbbba......',
  '....dbbbbba.....',
  '....dbeebea.....',
  '....dbbbbba.....',
  '.....dbbba......',
  '....c.dba.c.....',
  '...c...a...c....',
  '......c.c.......',
  '.....cc.cc......',
  '................',
  '................',
];

ART.wisp = [
  '................',
  '.......d........',
  '......dbd.......',
  '..d..dbbbd..d...',
  '....abbbbba.....',
  '...abbbbbbba....',
  '...abebbbeba....',
  '...abbbbbbba....',
  '...abbbccbba....',
  '....abbbbba.....',
  '.....abbba......',
  '..d...aba...d...',
  '.......a........',
  '.......d........',
  '................',
  '................',
];

ART.merchant = [
  '................',
  '.....hhhhh......',
  '....hhhhhhh.....',
  '...hhhhhhhhh....',
  '....hseseh......',
  '....hssssh..bbb.',
  '....hBBBBh.bpppb',
  '...rrrrrrrrbpgpb',
  '..rrrrlrrrrbpppb',
  '..rrrrlrrrrbbbbb',
  '..rsrrlrrrsr....',
  '..rrrrlrrrrr....',
  '..rrrrrrrrrr....',
  '..rrrrrrrrrr....',
  '...kk....kk.....',
  '................',
];

ART.boneking = [
  '...y..y..y......',
  '...yyyyyyy......',
  '...ygyyygy......',
  '...bbbbbbb......',
  '...baeaeab...w..',
  '...baaaaab..www.',
  '....cacac....w..',
  '..rrraaarrr..w..',
  '.rrraacaarrr.w..',
  '.rraacacaarr.w..',
  '.rr.aacaa.rraw..',
  '.rr..aaa..rr.w..',
  '.rr..a.a..rr....',
  '.rr.aa.aa.rr....',
  '.r..cc.cc..r....',
  '................',
];

ART.colossus = [
  '......d...d.....',
  '.....db..db.....',
  '....cccccccc....',
  '...caaaaaaaac...',
  '...caeeaaeeac...',
  '..dccaaaaaaccd..',
  '.dbaaccbbccaabd.',
  '.dbaaabbbbaaabd.',
  'cabaaabddbaaabac',
  'cabaaaabbaaaabac',
  'caaccaaaaaaccaac',
  '.ccc.caaaac.ccc.',
  '.....caaaac.....',
  '....caac.caac...',
  '...ccccc.ccccc..',
  '................',
];

ART.ignis = [
  '...hh...............',
  '....hh..............',
  '....aaaa............',
  '...aaeaaa...........',
  '..aaaaaaa.......ww..',
  '.nnaaaaaa.....wwww..',
  '.n.n..aaaa..wwwwww..',
  '.......aaaawwwwwwww.',
  '........aaaaawwwwww.',
  '.......aabbbbaawwww.',
  '......aabbbbbbaa.ww.',
  '......abbbbbbbbaa...',
  '.....aabbbbbbbbaa...',
  '.....aabbbbbbbaaaa..',
  '......aabbbbbaa..aa.',
  '.......aaaaaaa....aa',
  '.......aa...aa.....a',
  '......aac..aac......',
  '......ccc..ccc......',
  '....................',
];

ART.voidlord = [
  '....y........y......',
  '....yy......yy......',
  '.....yy....yy.......',
  '......hhhhhh........',
  '.....hhhhhhhh.......',
  '.....hheehheh.......',
  '.....hhhhhhhh....o..',
  '......hhhhhh....oOo.',
  '...rrrrrhhrrrrr..o..',
  '..rrrrrrrrrrrrrr.w..',
  '.rrrrrrrsrrrrrrrrw..',
  '.rrrrrrssssrrrrrrw..',
  '.rrrrrrrsrrrrrrrrw..',
  '.rrr.rrrrrrrr.rrrw..',
  '.rr..rrrrrrrr..rrw..',
  '.r...rrrrrrrrr..rw..',
  '....rrrrrrrrrrr..w..',
  '...rrrrrrrrrrrrr.w..',
  '..rrr.rrr.rrr.rrrw..',
  '....................',
];

/* ---------------- props / deco (16x16) ---------------- */
ART.shrine = [
  '................',
  '......dddd......',
  '.....dooood.....',
  '.....doOOod.....',
  '.....doOOod.....',
  '......dood......',
  '.......dd.......',
  '....aaaaaaaa....',
  '...abbbbbbbbc...',
  '....abggggbc....',
  '....abgaagbc....',
  '....abggggbc....',
  '....abbbbbbc....',
  '...aaaaaaaaac...',
  '..accccccccccc..',
  '................',
];
ART.gold = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.......dy.......',
  '.....yyyyyc.....',
  '....dyyyyyyc....',
  '...yyydyyyycc...',
  '..yyyyyyydyyyc..',
  '..cyyyyyyyyycc..',
  '...ccccccccc....',
  '................',
];
ART.grave = [
  '................',
  '................',
  '................',
  '................',
  '.....aaaaaa.....',
  '....abbbbbbc....',
  '....abbcbbbc....',
  '....abcccbbc....',
  '....abbcbbbc....',
  '....abbbbbbc....',
  '....abbbbbbc....',
  '...mabbbbbbcm...',
  '..mmcccccccccm..',
  '................',
  '................',
  '................',
];
ART.bones = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..........aa....',
  '...aa....abea...',
  '....aa...aaaa...',
  '.....aa...cc....',
  '......aa........',
  '..aa...aa..aaa..',
  '...aaaaaaaaa.aa.',
  '................',
];
ART.rubble = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.........ab.....',
  '...ab...abbc....',
  '..abbc...cc.....',
  '...cc.....ab....',
  '.........abc....',
  '................',
  '................',
];
ART.crystal = [
  '................',
  '................',
  '.......d........',
  '......dba.......',
  '......dba..d....',
  '...d..dba.dba...',
  '..dba.dbaadba...',
  '..dba.dbaadba...',
  '..dbaadbbadba...',
  '..dbbadbbadbba..',
  '.cdbbabbbabbbac.',
  '.ccccccccccccc..',
  '................',
  '................',
  '................',
  '................',
];
ART.shroom = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..........aaa...',
  '...aaa...abdba..',
  '..abdba..aaaaa..',
  '..aaaaa....s....',
  '....s......s....',
  '....s...aa.s....',
  '....s..abba.....',
  '.......aaaa.....',
  '.........s......',
  '................',
];
ART.cobweb = [
  'aaaaaaaa........',
  'a..a..a.........',
  'a.a.aa..........',
  'aa..a...........',
  'a.aa............',
  'aaa.............',
  'a...............',
  'a...............',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];
ART.pillar = [
  '...aaaaaaaaaa...',
  '..abbbbbbbbbbc..',
  '..acccccccccccc.',
  '...abdbbbbbbc...',
  '...abdbbbbbbc...',
  '...abdbbbbcbc...',
  '...abdbbbbbbc...',
  '...abdbbbbbbc...',
  '...abdbcbbbbc...',
  '...abdbbbbbbc...',
  '...abdbbbbbbc...',
  '...abdbbbbbbc...',
  '..aaaaaaaaaaac..',
  '..abbbbbbbbbbc..',
  '.cccccccccccccc.',
  '................',
];
ART.sconce = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '......a..a......',
  '......abba......',
  '.......cc.......',
  '.......cc.......',
  '........c.......',
  '................',
  '................',
  '................',
  '................',
  '................',
];
ART.obsidian = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..........a.....',
  '....a....aba....',
  '...aba..abbba...',
  '..abbba.abcba...',
  '..abcca.abcca...',
  '..accca..ccc....',
  '................',
  '................',
  '................',
];

/* ---------------- icons (14x14 → 16x16 with outline) ---------------- */
const ICON = {};
ICON.potion = [
  '.....kkkk.....', '.....kkkk.....', '......gg......', '......gg......',
  '.....gddg.....', '....gaaaag....', '...gabdaaag...', '..gabdaaaaag..',
  '..gabaaaaacg..', '..gaaaaaaacg..', '..gaaaaaaccg..', '...gcaacccg...',
  '....gccccg....', '.....gggg.....',
];
ICON.scroll = [
  '..............', '.wqppppppppqw.', '.wppppppppppw.', '..pqqqqqqqqp..',
  '..pppppppppp..', '..pqqqqqqqpp..', '..pppppaappp..', '..pqqqabbapp..',
  '..ppppaaappp..', '..pqqqqqqqqp..', '..pppppppppp..', '.wppppppppppw.',
  '.wqppppppppqw.', '..............',
];
ICON.tome = [
  '..............', '...aaaaaaaaa..', '..abbbbbbbbac.', '..abaaaaaaacc.',
  '..abaagggaacc.', '..abaggdgaacc.', '..abagdgggacc.', '..abaagggaacc.',
  '..abaaaaaaacc.', '..abaaaaaaacc.', '..accccccccpc.', '..cppppppppcc.',
  '...cccccccccc.', '..............',
];
ICON.missile = [
  '..........d...', '.....a...dbd..', '.....a....d...', '....aba.......',
  '....bdb.......', '.aabbddbbaa...', '....bdb.......', '....aba.......',
  '.....a....a...', '.....a...aba..', '..........a...', '..d...........',
  '.dbd..........', '..d...........',
];
ICON.firebolt = [
  '......a.......', '.....aa.......', '.....aba......', '....abba..a...',
  '...abbba.aa...', '...abdbbaba...', '..abbddbbba...', '..abddddbbba..',
  '..abdddddbba..', '..abddeddba...', '..abdeeedba...', '...abdddba....',
  '....aabbaa....', '......aa......',
];
ICON.iceshard = [
  '...........dd.', '..........dbb.', '.........dbba.', '...d....dbbac.',
  '..dbd..dbbac..', '...d..dbbac...', '.....dbbac....', '....dbbac.....',
  '...dbbac...d..', '..abbac...dbd.', '..aaac.....d..', '.aacc.........',
  '.ac...........', '..............',
];
ICON.lightning = [
  '........aaaa..', '.......abba...', '......abba....', '.....abba.....',
  '....abbbaaaa..', '...abdddbba...', '...aaaabdba...', '......abba....',
  '.....abba.....', '....abba......', '...aba........', '..aba.........',
  '..aa..........', '..............',
];
ICON.nova = [
  '......d.......', '....d.b.d.....', '.....bab......', '..d...a...d...',
  '...b..a..b....', '....b.a.b.....', 'dbaaaadaaaabd.', '....b.a.b.....',
  '...b..a..b....', '..d...a...d...', '.....bab......', '....d.b.d.....',
  '......d.......', '..............',
];
ICON.blink = [
  '..............', '.....aaaa.....', '...aabbbbaa...', '..abb....bba..',
  '..ab..dd..ba..', '.ab..dbbd..ba.', '.ab.db..bd.ba.', '.ab.db..bd.ba.',
  '.ab..dbbd..ba.', '..ab..dd..ba..', '..abb....bba..', '...aabbbbaa...',
  '.....aaaa.....', '..............',
];
ICON.heal = [
  '..............', '.....aaaa.....', '.....abba.....', '.....abba.....',
  '.aaaaabbaaaaa.', '.abbbbddbbbba.', '.abbddddddbba.', '.abbbbddbbbba.',
  '.aaaaabbaaaaa.', '.....abba.....', '.....abba.....', '.....abba.....',
  '.....aaaa.....', '..............',
];
ICON.shield = [
  '..............', '..aaaaaaaaaa..', '..abbbbbbbba..', '..abddbbbbca..',
  '..abdbbggbca..', '..abbbgddgca..', '..abbbggggca..', '..abbbbggbca..',
  '...abbbbbca...', '...abbbbcca...', '....abbcca....', '.....acca.....',
  '......aa......', '..............',
];
ICON.meteor = [
  'e.............', '.ed...........', '..edd.........', '...dddb.......',
  '....ddbb......', '.....dbcccc...', '......ccrrrc..', '.....ccrrcccc.',
  '.....crrcccrc.', '.....ccccrccc.', '......ccccccc.', '.......ccccc..',
  '..............', '..............',
];
ICON.venom = [
  '..............', '........aa....', '....aa.abba...', '...abba.aa....',
  '...aaaa..aaa..', '..aabbbaaabba.', '.abbdbbbbbbba.', '.abdbbbbbbbca.',
  '.abbbbbbbbcca.', '..accbbbbccca.', '...acccccccaa.', '....aaaaaaa...',
  '..............', '..............',
];
ICON.drain = [
  '......a.......', '......a.......', '.....aba......', '.....aba......',
  '....abbba.....', '....abdba.....', '...abdbbba....', '...abdbbba....',
  '..abdbbbbba...', '..abbbbbbca...', '..abbbbbcca...', '...abbccca....',
  '....aaaaa.....', '..............',
];
ICON.summon = [
  '......d.......', '.....dbd......', '..d.dbbbd.d...', '...abbbbba....',
  '..abbbbbbba...', '..abebbbeba...', '..abbbbbbba...', '..abbbccbba...',
  '...abbbbba....', '....abbba.....', '..d..aba..d...', '......a.......',
  '......d.......', '..............',
];
ICON.timestop = [
  '..............', '..cccccccccc..', '...abbbbbba...', '...adddddba...',
  '....addddba...', '.....adda.....', '......da......', '......ad......',
  '.....abba.....', '....abdbba....', '...abddddba...', '...adddddda...',
  '..cccccccccc..', '..............',
];
/* relic shapes */
ICON.medallion = [
  '..............', '.....cccc.....', '...ccaaaacc...', '..caabbbbaac..',
  '..cabbddbbac..', '.cabbdeedbbac.', '.cabdeeeedbac.', '.cabbdeedbbac.',
  '.cabbbddbbbac.', '..cabbbbbbac..', '..caabbbbaac..', '...ccaaaacc...',
  '.....cccc.....', '..............',
];
ICON.heart = [
  '..............', '..aaa....aaa..', '.abbba..abbba.', 'abddbbaabbbbca',
  'abdbbbbbbbbbca', 'abbbbbbbbbbbca', 'abbbbbbbbbbcca', '.abbbbbbbbcca.',
  '..abbbbbbcca..', '...abbbbcca...', '....abbcca....', '.....acca.....',
  '......aa......', '..............',
];
ICON.ring = [
  '..............', '.....dgd......', '....dgggd.....', '.....dgd......',
  '....aaaaaa....', '...ab....ca...', '..ab......ca..', '..a........a..',
  '..a........a..', '..ab......ca..', '...ab....ca...', '....aaaaaa....',
  '..............', '..............',
];
ICON.gem = [
  '..............', '....aaaaaa....', '...abbdbbba...', '..abbddbbbca..',
  '.aaaaaaaaaaaa.', '.abbbdbbbbbca.', '..abbdbbbbca..', '...abbbbbca...',
  '....abbbbca...', '.....abbca....', '......aca.....', '.......a......',
  '..............', '..............',
];
ICON.fang = [
  '..............', '..cccccccccc..', '..caaaaaaaac..', '...cabbbbac...',
  '...cabdbbac...', '....cabdbac...', '....cabbbc....', '.....cabbc....',
  '.....cabc.....', '......cbc.....', '......cbc.....', '.......c......',
  '..............', '..............',
];
ICON.amulet = [
  '..c........c..', '...c......c...', '....c....c....', '.....c..c.....',
  '......cc......', '.....aaaa.....', '....abbbba....', '...abbddbba...',
  '...abdeedba...', '...abbddbba...', '....abbbba....', '.....aaaa.....',
  '..............', '..............',
];
ICON.feather = [
  '...........aa.', '.........aabb.', '........abbbd.', '.......abbbdb.',
  '......abbbdba.', '.....abbbdba..', '....abbbdba...', '...abbbdba....',
  '...abbdba.....', '..abbdba......', '..abdba.......', '..cda.........',
  '.c............', 'c.............',
];
ICON.eye = [
  '..............', '..............', '....aaaaaa....', '..aabbbbbbaa..',
  '.abbbccccbbba.', 'abbbcddeecbbba', 'abbbcdeeecbbba', 'abbbceeeecbbba',
  '.abbbccccbbba.', '..aabbbbbbaa..', '....aaaaaa....', '..............',
  '..............', '..............',
];
ICON.cloak = [
  '.....dddd.....', '....dbbbbd....', '...abbbbbba...', '..abbbccbbba..',
  '..abbc..cbba..', '.abbbc..cbbba.', '.abbbbccbbbba.', '.abbbbbbbbbba.',
  'aabbbbbbbbbbaa', 'abbbbbbbbbbbba', 'abtbbtbbtbbtba', 'aatatatatataaa',
  '..............', '..............',
];
ICON.coin = [
  '..............', '.....cccc.....', '...ccaaaacc...', '..caabbbbaac..',
  '..cabbaabbac..', '.cabbabbabbac.', '.cabbabbbbbac.', '.cabbabbabbac.',
  '.cabbbaabbbac.', '..cabbbbbbac..', '..caabbbbaac..', '...ccaaaacc...',
  '.....cccc.....', '..............',
];
ICON.chalice = [
  '..............', '.aaaaaaaaaaaa.', '.abddddddddba.', '.abeeeeeeeeba.',
  '..abbbbbbbba..', '...abbbbbba...', '....abbbba....', '.....abba.....',
  '......aa......', '......aa......', '.....abba.....', '...aabbbbaa...',
  '...cccccccc...', '..............',
];
ICON.fruit = [
  '.......l......', '......l.......', '.....lmm......', '....aaalaa....',
  '...abbbabbba..', '..abddbbbbbca.', '..abdbbbbbbca.', '..abbbbbbbbca.',
  '..abbbbbbbbca.', '..abbbbbbbcca.', '...abbbbbcca..', '....acccca....',
  '..............', '..............',
];
ICON.boot = [
  '..............', '....aaaaaa....', '....abbbbc....', '....abdbbc....',
  '....abbbbc....', '....abdbbc....', '....abbbbc....', '....abdbbbaa..',
  '...abbbbbbbba.', '..abbbbbbbbbca', '..abbbbbbbbbca', '..cccccccccccc',
  '..............', '..............',
];
ICON.lens = [
  '..............', '....aaaaa.....', '...abbbbba....', '..abdddbbba...',
  '..abddbbbba...', '..abdbbbbba...', '..abbbbbbba...', '...abbbbba....',
  '....aaaaaa....', '........aa....', '.........aa...', '..........aa..',
  '...........a..', '..............',
];
ICON.drop = [
  '......a.......', '.....aba......', '.....aba......', '....abbba.....',
  '....abdba.....', '...abdbbba....', '...abdbbba....', '..abdbbbbba...',
  '..abbbbbbca...', '..abbbbbcca...', '...abbccca....', '....aaaaa.....',
  '..............', '..............',
];
ICON.star = [
  '......a.......', '.....aba......', '.....aba......', '....abdba.....',
  'aaaaabdbaaaaa.', '.abbbddddbba..', '..abbddddba...', '...abbbbba....',
  '...abbabbba...', '..abba.abba...', '..aba...aba...', '..aa.....aa...',
  '..............', '..............',
];

/* palettes ------------------------------------------------- */
const P = {
  slime: { a: '#4fbf5f', b: '#7fe08a', c: '#2c7a3c', d: '#e8ffe8', e: '#14301a' },
  slimeBlue: { a: '#4f8fd8', b: '#88bdf5', c: '#2c568a', d: '#f0f8ff', e: '#101c33' },
  magmaslime: { a: '#e8622a', b: '#ffaa45', c: '#8a2a18', d: '#fff2b0', e: '#2a0a05' },
  rat: { a: '#7a6a62', b: '#9a8a80', c: '#4a3e3a', e: '#ff4040', p: '#d89aa0', n: '#d89aa0' },
  bat: { a: '#4a3a5c', c: '#2a1f36', e: '#ff4a4a', f: '#f0f0f0' },
  skeleton: { a: '#d8d2bc', b: '#f2eedd', c: '#8f8a78', e: '#ff5a3a', w: '#9aa0a8' },
  archer: { a: '#d8d2bc', b: '#f2eedd', c: '#8f8a78', e: '#ffd23a', w: '#8a5a32', t: '#e6e0c8' },
  spider: { a: '#2c3550', b: '#6fe3ff', c: '#141a2c', d: '#e0fbff', e: '#ff3a5a' },
  frostwisp: { a: '#5fbfe8', b: '#bff0ff', c: '#88d8f5', d: '#ffffff', e: '#103a5a' },
  golem: { a: '#7d7a72', b: '#9d9a90', c: '#4a4842', e: '#ffcf4a', m: '#5f8a4c' },
  goblin: { a: '#6f9a3c', g: '#4f7a2c', e: '#ffe04a', n: '#f0f0e0', b: '#3a2a1a', l: '#6a4a2a', d: '#8a6a3a', c: '#3a2a1a', w: '#b0b4bc' },
  mimic: { w: '#4a2e18', b: '#8a5a2c', g: '#e8c170', t: '#f4f0e0', r: '#5a0f18', p: '#e04a6a' },
  chest: { w: '#4a2e18', b: '#8a5a2c', g: '#e8c170', y: '#fff3b0', k: '#1a0f08' },
  imp: { a: '#d84a32', b: '#f08a5a', c: '#5a1a12', e: '#ffe04a', h: '#2a1a1a', n: '#ffffff', w: '#8a2a22', t: '#d84a32' },
  hound: { a: '#3a2a2a', c: '#1a1010', e: '#ffcf3a', f: '#ff7a2a', n: '#f0f0f0' },
  darkmage: { h: '#3a2a4a', r: '#2e2440', l: '#c79bff', e: '#ff4aa0', o: '#c79bff', O: '#ffffff', w: '#5a4a3a' },
  voideye: { a: '#3a2a5a', b: '#6a4a9a', w: '#f2ecff', p: '#c03a6a', e: '#120818', t: '#6a4a9a' },
  shadowknight: { a: '#2a2a3a', b: '#4a4a62', c: '#14141e', e: '#ff3a3a', p: '#c03a3a', s: '#b0b8d0', h: '#6a5a3a' },
  wraith: { a: '#5a6a8a', b: '#a8b8d8', c: '#d8e4ff', e: '#7affd8' },
  shard: { a: '#3fa8d8', b: '#9fe8ff', c: '#2a5a7a', d: '#ffffff', e: '#103a5a' },
  wisp: { a: '#e8b84a', b: '#fff0b0', c: '#ffd870', d: '#ffffff', e: '#5a3a10' },
  merchant: { h: '#5a3a5a', s: '#e8c0a0', e: '#2a1a1a', B: '#c8c0b0', r: '#3a5a4a', l: '#e8c170', b: '#7a5a3a', p: '#a87a4a', g: '#e8c170', k: '#3a2a1a' },
  boneking: { a: '#e0d8c0', b: '#f8f2e0', c: '#9a927e', e: '#4affd8', y: '#f0c040', g: '#e04a5a', r: '#6a1a2a', w: '#c8a040' },
  colossus: { a: '#4a7aa8', b: '#8fd8ff', c: '#22385a', d: '#e8fbff', e: '#ff5ae0' },
  ignis: { a: '#b8322a', b: '#f0a040', c: '#5a1410', e: '#ffee55', h: '#e8d8b0', n: '#ffd27a', w: '#7a1a1a' },
  voidlord: { y: '#d8c8ff', h: '#2a1f40', e: '#ff4a7a', r: '#1c1630', s: '#b9a8ff', o: '#b9a8ff', O: '#ffffff', w: '#6a5a8a' },
  shrine: { a: '#6a6a78', b: '#9a9aa8', c: '#3a3a48', g: '#e8c170', d: '#fff3c0', o: '#7fe3ff', O: '#ffffff' },
  gold: { y: '#f0c040', c: '#a87a1a', d: '#fff8c0' },
  grave: { a: '#5a5e66', b: '#7a7e86', c: '#3a3d44', m: '#4f7a3c' },
  bones: { a: '#cfc8b0', b: '#efe8d0', c: '#8a8270', e: '#2a2420' },
  rubble: { a: '#5a5e64', b: '#7a7e86', c: '#34363a' },
  crystal: { a: '#3fa8d8', b: '#8fe0ff', c: '#22506a', d: '#e8fdff' },
  crystalViolet: { a: '#7a6ad8', b: '#bfb0ff', c: '#3a2f6a', d: '#f4f0ff' },
  shroom: { a: '#3fbfa8', b: '#8ff0d8', d: '#e8fff8', s: '#c8d8c8' },
  cobweb: { a: 'rgba(220,220,230,0.55)' },
  pillar: { a: '#5a5e66', b: '#868a92', c: '#33363c', d: '#a8acb4' },
  sconce: { a: '#6a5a4a', b: '#8a7a6a', c: '#3a2e24' },
  obsidian: { a: '#2a2030', b: '#5a4a6a', c: '#140e18' },
};
G.PAL = P;

/* icon palettes */
const IP = {
  potion_red: { a: '#e0384a', b: '#ff7080', c: '#901828', d: '#ffffff', g: '#c8d4e0', k: '#8a5a32' },
  potion_blue: { a: '#3a6ae0', b: '#70a0ff', c: '#1a3490', d: '#ffffff', g: '#c8d4e0', k: '#8a5a32' },
  potion_gold: { a: '#e8b030', b: '#ffe070', c: '#9a6a10', d: '#ffffff', g: '#c8d4e0', k: '#8a5a32' },
  potion_green: { a: '#3ab85a', b: '#70f090', c: '#1a7030', d: '#ffffff', g: '#c8d4e0', k: '#8a5a32' },
  potion_violet: { a: '#9a5ae0', b: '#c8a0ff', c: '#5a2a90', d: '#ffffff', g: '#c8d4e0', k: '#8a5a32' },
  scroll_teal: { p: '#efe2c0', q: '#b8a682', w: '#8a5a32', a: '#2fa8a0', b: '#7ff0e0' },
  scroll_gold: { p: '#efe2c0', q: '#b8a682', w: '#8a5a32', a: '#e0a830', b: '#fff0a0' },
  scroll_red: { p: '#efe2c0', q: '#b8a682', w: '#8a5a32', a: '#d8382a', b: '#ff9070' },
  scroll_blue: { p: '#efe2c0', q: '#b8a682', w: '#8a5a32', a: '#3a7ae0', b: '#a0d0ff' },
  tome: { a: '#7a2a3a', b: '#a84a5a', c: '#4a1420', g: '#e8c170', d: '#fff3c0', p: '#efe2c0' },
  /* spells */
  missile: { a: '#e8b84a', b: '#ffe08a', d: '#ffffff' },
  firebolt: { a: '#c8301a', b: '#ff7a2a', d: '#ffd04a', e: '#ffffe0' },
  iceshard: { a: '#3a8ac8', b: '#9fe8ff', c: '#1a4a7a', d: '#ffffff' },
  lightning: { a: '#c89a10', b: '#ffe04a', d: '#ffffff' },
  nova: { a: '#5fc8f0', b: '#bff0ff', d: '#ffffff' },
  blink: { a: '#c88a2a', b: '#ffd27a', d: '#7ff0ff' },
  heal: { a: '#3a9a5a', b: '#8ff0a8', d: '#fff8c8' },
  shield: { a: '#4a6aa8', b: '#8fb8f0', c: '#2a3a68', d: '#ffffff', g: '#ffd27a' },
  meteor: { e: '#ffffff', d: '#ffe04a', b: '#ff8a2a', c: '#5a2a1a', r: '#ff6a2a' },
  venom: { a: '#4a8a2a', b: '#9be15d', c: '#2a5a1a', d: '#e8ffc8' },
  drain: { a: '#7a1a2a', b: '#d83a4a', c: '#4a0a14', d: '#ff9aa8' },
  summon: { a: '#e8b84a', b: '#fff0b0', d: '#ffffff', e: '#5a3a10', c: '#ffd870' },
  timestop: { a: '#8a6a3a', b: '#d8c8a0', c: '#5a3a1a', d: '#ffe08a' },
  /* relics */
  r_sigil_fire: { a: '#c8902a', b: '#e04a2a', c: '#5a2a10', d: '#ff9a3a', e: '#ffe070', s: 'medallion' },
  r_heart_ice: { a: '#2a6a9a', b: '#7fd8ff', c: '#1a3a5a', d: '#ffffff', s: 'heart' },
  r_ring_storm: { a: '#c8a040', g: '#ffe04a', d: '#ffffff', c: '#7a5a20', s: 'ring' },
  r_stone: { a: '#8a1a2a', b: '#e03a4a', c: '#4a0a14', d: '#ffb0b8', s: 'gem' },
  r_fang: { a: '#e8e0d0', b: '#ffffff', c: '#6a2a2a', d: '#ffd0d0', s: 'fang' },
  r_amulet: { a: '#8a8e98', b: '#b8bcc8', c: '#c8a040', d: '#ffffff', e: '#4aa0e0', s: 'amulet' },
  r_quill: { a: '#9aa8b8', b: '#e8f0f8', c: '#5a4a3a', d: '#ffffff', s: 'feather' },
  r_feather: { a: '#c8401a', b: '#ff9a3a', c: '#7a2a10', d: '#ffe070', s: 'feather' },
  r_eye: { a: '#3a2a5a', b: '#e8e0ff', c: '#2a8aa8', d: '#ffffff', e: '#1a2a3a', s: 'eye' },
  r_cloak: { a: '#2a4a2a', b: '#4a7a3a', c: '#1a2a1a', d: '#8ab06a', t: '#c8d070', s: 'cloak' },
  r_coin: { a: '#e0a830', b: '#ffe070', c: '#8a5a10', s: 'coin' },
  r_blood: { a: '#5a0a14', b: '#c01a2a', c: '#3a0008', d: '#ff7080', s: 'drop' },
  r_well: { a: '#8a8e98', b: '#c8ccd8', d: '#a0d8ff', e: '#3a7ae0', c: '#4a4e58', s: 'chalice' },
  r_fruit: { a: '#a87a10', b: '#f0c040', c: '#6a4a08', d: '#fff8c0', l: '#3a7a2a', m: '#6ac04a', s: 'fruit' },
  r_tome: { a: '#1d555c', b: '#2f8f96', c: '#0e3036', g: '#e8c170', d: '#fff3c0', p: '#efe2c0', s: 'tome' },
  r_boots: { a: '#4a3a2a', b: '#8a6a4a', c: '#2a1a10', d: '#c8a070', s: 'boot' },
  r_lens: { a: '#c8a040', b: '#9ad8f0', d: '#ffffff', s: 'lens' },
  r_venom: { a: '#4a8a2a', b: '#9be15d', c: '#1a3a10', d: '#e8ffc8', s: 'fang' },
  /* boons */
  b_hp: { a: '#a01a2a', b: '#e84a5a', c: '#5a0a14', d: '#ffc0c8', s: 'heart' },
  b_mp: { a: '#1a4aa0', b: '#4a8ae8', c: '#0a245a', d: '#c0e0ff', s: 'drop' },
  b_pow: { a: '#c8902a', b: '#ffd27a', d: '#ffffff', s: 'star' },
  b_def: { a: '#6a6e78', b: '#a8acb8', c: '#3a3e48', d: '#ffffff', g: '#e8c170', s: 'shield' },
  b_regen: { a: '#2a6ac8', b: '#7ab8ff', d: '#d0f0ff', s: 'blink' },
  b_vigor: { a: '#2a8a4a', b: '#7ae09a', d: '#f0fff0', s: 'heal' },
};
G.ICON_PAL = IP;

/* ---------------- builders ---------------- */
function parse(rows, pal) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const ch = rows[j][i];
      if (!ch || ch === '.') continue;
      const col = pal[ch];
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(i, j, 1, 1);
    }
  }
  return c;
}

function outlined(src, color = OUTLINE) {
  const w = src.width + 2, h = src.height + 2;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const sd = src.getContext('2d').getImageData(0, 0, src.width, src.height).data;
  const a = (i, j) => (i < 0 || j < 0 || i >= src.width || j >= src.height ? 0 : sd[(j * src.width + i) * 4 + 3]);
  x.fillStyle = color;
  for (let j = -1; j <= src.height; j++) {
    for (let i = -1; i <= src.width; i++) {
      if (a(i, j) > 0) continue;
      if (a(i - 1, j) > 0 || a(i + 1, j) > 0 || a(i, j - 1) > 0 || a(i, j + 1) > 0) x.fillRect(i + 1, j + 1, 1, 1);
    }
  }
  x.drawImage(src, 1, 1);
  return c;
}

function silhouette(src, color) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

function makeSprite(rows, pal, opts = {}) {
  const base = parse(rows, pal);
  const img = opts.noOutline ? base : outlined(base);
  return {
    img,
    flash: silhouette(img, '#ffffff'),
    w: img.width, h: img.height,
  };
}
G.Spr.make = makeSprite;

/* icon: draw 14x14 into an outlined 16x16 */
function makeIcon(shape, pal) {
  const rows = ICON[shape];
  const base = parse(rows, pal);
  return outlined(base);
}

/* data URL cache for DOM usage */
const urlCache = {};
G.Spr.iconURL = function (key) {
  if (urlCache[key]) return urlCache[key];
  const icon = G.Spr.icons[key];
  if (!icon) return '';
  const s = 4;
  const c = document.createElement('canvas');
  c.width = icon.width * s; c.height = icon.height * s;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(icon, 0, 0, c.width, c.height);
  urlCache[key] = c.toDataURL();
  return urlCache[key];
};
G.Spr.spriteURL = function (sprite, s = 4) {
  const c = document.createElement('canvas');
  c.width = sprite.w * s; c.height = sprite.h * s;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(sprite.img, 0, 0, c.width, c.height);
  return c.toDataURL();
};

G.Spr.playerSprite = function (clsId) {
  const C = G.CLASSES[clsId];
  const pal = {
    H: C.hat, h: G.shade(C.hat, -0.35), b: C.trim, s: '#f0c8a0', e: '#1a1418',
    R: C.robe, r: C.robeDark, l: C.trim, w: '#8a5a32', g: '#ffd24a', G: '#fff6c0', k: '#3a2a20',
  };
  if (clsId === 'cryo') { pal.g = '#7fe3ff'; pal.G = '#ffffff'; pal.b = '#7fb8e0'; }
  if (clsId === 'pyro') { pal.g = '#ff7a2a'; pal.G = '#ffe070'; }
  if (clsId === 'hemo') { pal.g = '#e0384a'; pal.G = '#ffb0b8'; }
  return makeSprite(ART.player, pal);
};

/* ---------------- procedural tiles ---------------- */
function tileCanvas() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  return c;
}
function px(x, c, i, j, w = 1, h = 1) { x.fillStyle = c; x.fillRect(i, j, w, h); }

function makeFloor(b, variant, seed) {
  const c = tileCanvas(), x = c.getContext('2d');
  const f = b.floor;
  px(x, f[0], 0, 0, 16, 16);
  const rnd = (n) => G.hash2(n, variant, seed);
  // speckles
  for (let n = 0; n < 34; n++) {
    const i = Math.floor(rnd(n) * 16), j = Math.floor(rnd(n + 99) * 16);
    px(x, rnd(n + 7) > 0.5 ? f[1] : f[2], i, j);
  }
  if (b.cave < 0.5) {
    // flagstone seams
    const off = variant % 2 ? 8 : 0;
    x.fillStyle = f[3];
    x.fillRect(0, 7, 16, 1);
    x.fillRect((3 + off) % 16, 0, 1, 7);
    x.fillRect((11 + off) % 16, 8, 1, 8);
    x.fillStyle = G.shade(f[0], 0.08);
    x.fillRect(0, 8, 16, 1);
  } else {
    // organic pebbles
    for (let n = 0; n < 4; n++) {
      const i = Math.floor(rnd(n + 300) * 14), j = Math.floor(rnd(n + 400) * 14);
      px(x, f[3], i, j + 1, 2, 1);
      px(x, f[2], i, j, 2, 1);
    }
  }
  if (variant === 3) {
    // crack
    let i = 4 + Math.floor(rnd(500) * 6), j = 3;
    x.fillStyle = f[3];
    for (let k = 0; k < 9; k++) { x.fillRect(i, j, 1, 1); j++; i += rnd(600 + k) > 0.5 ? 1 : -1; }
  }
  return c;
}

function makeWallFace(b, variant) {
  const c = tileCanvas(), x = c.getContext('2d');
  const W = b.wall;
  px(x, W.top, 0, 0, 16, 4);
  px(x, W.light, 0, 4, 16, 1);
  px(x, W.face, 0, 5, 16, 11);
  // bricks
  x.fillStyle = W.mortar;
  x.fillRect(0, 8, 16, 1);
  x.fillRect(0, 12, 16, 1);
  const o = variant % 2 ? 4 : 0;
  x.fillRect((3 + o) % 16, 5, 1, 3); x.fillRect((11 + o) % 16, 5, 1, 3);
  x.fillRect((7 + o) % 16, 9, 1, 3); x.fillRect((15 + o) % 16, 9, 1, 3);
  x.fillRect((3 + o) % 16, 13, 1, 3); x.fillRect((11 + o) % 16, 13, 1, 3);
  // highlights / shading
  for (let n = 0; n < 14; n++) {
    const i = Math.floor(G.hash2(n, variant, 7) * 16), j = 5 + Math.floor(G.hash2(n, variant, 8) * 11);
    px(x, G.hash2(n, variant, 9) > 0.5 ? W.dark : W.light, i, j);
  }
  px(x, W.dark, 0, 15, 16, 1);
  if (b.id === 'crypt' && variant === 2) { px(x, b.accent, 2, 5, 3, 1); px(x, b.accent, 3, 6, 1, 2); px(x, G.shade(b.accent, -0.3), 12, 9, 2, 1); }
  if (b.id === 'molten' && variant === 2) { px(x, '#ff7a2a', 5, 10, 1, 1); px(x, '#ff7a2a', 6, 11, 2, 1); px(x, '#ffb04a', 7, 12, 1, 1); }
  if (b.id === 'void' && variant >= 2) { px(x, '#9fd8ff', 4 + variant, 7, 1, 1); px(x, '#d8c8ff', 11, 13, 1, 1); }
  return c;
}

function makeWallTop(b, variant) {
  const c = tileCanvas(), x = c.getContext('2d');
  const W = b.wall;
  px(x, W.top, 0, 0, 16, 16);
  for (let n = 0; n < 10; n++) {
    const i = Math.floor(G.hash2(n, variant, 17) * 16), j = Math.floor(G.hash2(n, variant, 18) * 16);
    px(x, G.shade(W.top, 0.12), i, j);
  }
  return c;
}

function makeStairs(b) {
  const c = tileCanvas(), x = c.getContext('2d');
  px(x, b.floor[0], 0, 0, 16, 16);
  px(x, '#05060a', 2, 2, 12, 12);
  const steps = ['#7a7e86', '#62666e', '#4a4e56', '#34373e', '#22252a'];
  for (let k = 0; k < 5; k++) {
    px(x, steps[k], 2 + k, 2 + k * 2, 12 - k * 2 > 0 ? 12 - k : 1, 2);
    px(x, G.shade(steps[k], 0.25), 2 + k, 2 + k * 2, 12 - k, 1);
  }
  px(x, b.wall.light, 1, 1, 14, 1); px(x, b.wall.light, 1, 1, 1, 14);
  px(x, b.wall.dark, 14, 1, 1, 14); px(x, b.wall.dark, 1, 14, 14, 1);
  return c;
}

function makeLiquid(kind, frame) {
  const c = tileCanvas(), x = c.getContext('2d');
  if (kind === 'water') {
    px(x, '#1c3a56', 0, 0, 16, 16);
    for (let n = 0; n < 8; n++) {
      const i = (Math.floor(G.hash2(n, 1, 3) * 16) + frame * 2) % 16;
      const j = Math.floor(G.hash2(n, 2, 3) * 16);
      px(x, '#2f5a80', i, j, 3, 1);
      if (n % 3 === 0) px(x, '#5f9ac0', (i + 1) % 16, j, 1, 1);
    }
  } else if (kind === 'lava') {
    px(x, '#c8401a', 0, 0, 16, 16);
    for (let n = 0; n < 14; n++) {
      const i = (Math.floor(G.hash2(n, 1, 5) * 16) + frame) % 16;
      const j = (Math.floor(G.hash2(n, 2, 5) * 16) + (n % 2 ? frame : 0)) % 16;
      px(x, n % 3 ? '#ff7a2a' : '#ffc04a', i, j, 2, 2);
    }
    for (let n = 0; n < 5; n++) {
      const i = (Math.floor(G.hash2(n, 9, 5) * 16) + 16 - frame) % 16;
      const j = Math.floor(G.hash2(n, 8, 5) * 16);
      px(x, '#7a1a0a', i, j, 3, 1);
    }
  } else if (kind === 'chasm') {
    px(x, '#04040a', 0, 0, 16, 16);
    for (let n = 0; n < 5; n++) {
      const i = Math.floor(G.hash2(n, frame, 11) * 16), j = Math.floor(G.hash2(n, frame, 12) * 16);
      px(x, n % 2 ? '#3a3a6a' : '#8a8ad8', i, j);
    }
  }
  return c;
}

/* ---------------- init ---------------- */
G.Spr.init = function () {
  const S = (G.Spr.s = {});
  const mk = (name, art, pal) => (S[name] = makeSprite(ART[art || name], P[pal || name]));
  mk('rat'); mk('slime'); mk('bat'); mk('skeleton'); mk('archer'); mk('spider');
  mk('frostwisp'); mk('golem'); mk('goblin'); mk('mimic'); mk('chest'); mk('chestOpen', 'chestOpen', 'chest');
  mk('imp'); mk('hound'); mk('magmaslime', 'slime', 'magmaslime'); mk('darkmage'); mk('voideye');
  mk('shadowknight'); mk('wraith'); mk('shard'); mk('wisp'); mk('merchant');
  mk('boneking'); mk('colossus'); mk('ignis'); mk('voidlord');
  mk('shrine'); mk('gold'); mk('grave'); mk('bones'); mk('rubble'); mk('crystal');
  mk('crystalViolet', 'crystal', 'crystalViolet'); mk('shroom'); mk('pillar'); mk('sconce'); mk('obsidian');
  S.cobweb = makeSprite(ART.cobweb, P.cobweb, { noOutline: true });

  // icons
  const I = (G.Spr.icons = {});
  for (const k of ['potion_red', 'potion_blue', 'potion_gold', 'potion_green', 'potion_violet']) I[k] = makeIcon('potion', IP[k]);
  for (const k of ['scroll_teal', 'scroll_gold', 'scroll_red', 'scroll_blue']) I[k] = makeIcon('scroll', IP[k]);
  I.tome = makeIcon('tome', IP.tome);
  for (const k of G.SPELL_POOL) I[k] = makeIcon(k, IP[k]);
  for (const k in IP) if (IP[k].s) I[k] = makeIcon(IP[k].s, IP[k]);
  I.gold = outlined(parse(ART.gold.slice(6, 16).map((r) => r.slice(1, 15)), P.gold));

  // tiles per biome
  G.Spr.tiles = {};
  G.BIOMES.forEach((b, bi) => {
    const T = (G.Spr.tiles[b.id] = {});
    T.floor = [0, 1, 2, 3].map((v) => makeFloor(b, v, bi * 31 + 3));
    T.face = [0, 1, 2, 3].map((v) => makeWallFace(b, v));
    T.top = [0, 1].map((v) => makeWallTop(b, v));
    T.stairs = makeStairs(b);
  });
  G.Spr.liquid = {
    water: [0, 1, 2, 3].map((f) => makeLiquid('water', f)),
    lava: [0, 1, 2, 3].map((f) => makeLiquid('lava', f)),
    chasm: [0, 1, 2, 3].map((f) => makeLiquid('chasm', f)),
  };
};

/* expose raw art for validation */
G.Spr.ART = ART;
G.Spr.ICON = ICON;
