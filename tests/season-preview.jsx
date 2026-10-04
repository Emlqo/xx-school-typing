import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import StudentHomeShopPanel from '../src/components/common/StudentHomeShopPanel.jsx';
import LeaderboardPanel from '../src/components/teacher/LeaderboardPanel.jsx';
import {COSMETIC_ITEMS} from '../src/constants/cosmetics.js';
import '../src/styles/global.css';
import '../src/styles/season-cosmetics.css';

const season = COSMETIC_ITEMS.filter(item=>item.season==='autumn');
function Preview(){
  const [student,setStudent]=useState({id:'preview',name:'미리보기 학생',totalPoints:500,bestScore:2400,ownedCosmetics:['glow_teal',...season.map(item=>item.id)],equippedCosmetic:'lightning_core'});
  const shopItems=season.map(item=>({...item,id:`shop-${item.id}`,cosmeticId:item.id,itemType:'cosmetic',stock:10,active:true,season:2,scope:'school'}));
  window.setSeasonStudent=setStudent;
  return <main className="max-w-5xl mx-auto p-4 space-y-6"><StudentHomeShopPanel student={student} shopItems={shopItems} onEquipCosmetic={(_,id)=>setStudent(s=>({...s,equippedCosmetic:id}))}/><LeaderboardPanel leaderboardScores={season.map((item,i)=>({id:item.id,nickname:item.name,score:4000-i*500,cpm:120,equippedCosmetic:item.id}))}/></main>;
}
createRoot(document.getElementById('root')).render(<Preview/>);
