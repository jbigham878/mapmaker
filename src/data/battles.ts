export interface BattleCategory {
  label: string
  battles: string[]
}

export interface Campaign {
  label: string
  era: string
  battles: string[]
}

export const BATTLE_CATEGORIES: BattleCategory[] = [
  {
    label: 'Revolutionary War',
    battles: [
      'Battle of Lexington and Concord',
      'Battle of Bunker Hill',
      'Battle of Long Island',
      'Battle of Harlem Heights',
      'Battle of White Plains',
      'Battle of Fort Washington',
      'Battle of Trenton',
      'Battle of Princeton',
      'Battle of Brandywine',
      'Battle of Paoli',
      'Battle of Germantown',
      'Battle of Saratoga',
      'Battle of Monmouth',
      'Battle of Cowpens',
      'Battle of Guilford Court House',
      'Siege of Yorktown',
    ],
  },
  {
    label: 'War of 1812',
    battles: [
      'Battle of Queenston Heights',
      'Battle of Lake Erie',
      'Battle of the Thames',
      'Battle of Horseshoe Bend',
      'Battle of Bladensburg',
      'Burning of Washington',
      'Battle of Baltimore',
      'Battle of Plattsburgh',
      'Battle of New Orleans',
    ],
  },
  {
    label: 'Civil War',
    battles: [
      'Battle of Fort Sumter',
      'First Battle of Bull Run',
      'Battle of Shiloh',
      'Battle of Antietam',
      'Battle of Fredericksburg',
      'Battle of Chancellorsville',
      'Battle of Gettysburg',
      'Siege of Vicksburg',
      'Battle of Chickamauga',
      'Battle of the Wilderness',
      'Battle of Spotsylvania Court House',
      'Battle of Cold Harbor',
      'Battle of Atlanta',
      'Battle of Franklin',
      'Battle of Nashville',
      'Battle of Appomattox Court House',
    ],
  },
]

export const CAMPAIGNS: Campaign[] = [
  {
    label: 'Boston Campaign',
    era: 'Revolutionary War · 1775',
    battles: [
      'Battle of Lexington and Concord',
      'Battle of Bunker Hill',
      'Siege of Boston',
    ],
  },
  {
    label: 'New York Campaign',
    era: 'Revolutionary War · 1776',
    battles: [
      'Battle of Long Island',
      'Battle of Harlem Heights',
      'Battle of White Plains',
      'Battle of Fort Washington',
    ],
  },
  {
    label: 'Trenton-Princeton Campaign',
    era: 'Revolutionary War · 1776–1777',
    battles: [
      'Battle of Trenton',
      'Battle of Princeton',
    ],
  },
  {
    label: 'Philadelphia Campaign',
    era: 'Revolutionary War · 1777',
    battles: [
      'Battle of Brandywine',
      'Battle of Paoli',
      'Battle of Germantown',
    ],
  },
  {
    label: 'Saratoga Campaign',
    era: 'Revolutionary War · 1777',
    battles: [
      'Battle of Fort Ticonderoga',
      'Battle of Hubbardton',
      'Battle of Bennington',
      'Battle of Freeman\'s Farm',
      'Battle of Bemis Heights',
    ],
  },
  {
    label: 'Southern Campaign',
    era: 'Revolutionary War · 1780–1781',
    battles: [
      'Battle of Camden',
      'Battle of Kings Mountain',
      'Battle of Cowpens',
      'Battle of Guilford Court House',
      'Siege of Yorktown',
    ],
  },
  {
    label: 'Gettysburg Campaign',
    era: 'Civil War · 1863',
    battles: [
      'Battle of Brandy Station',
      'Second Battle of Winchester',
      'Battle of Gettysburg',
      'Battle of Falling Waters',
    ],
  },
  {
    label: 'Overland Campaign',
    era: 'Civil War · 1864',
    battles: [
      'Battle of the Wilderness',
      'Battle of Spotsylvania Court House',
      'Battle of North Anna',
      'Battle of Cold Harbor',
      'Siege of Petersburg',
    ],
  },
]
