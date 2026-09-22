import type { Restaurant } from "./model";

const restaurants: Array<Restaurant & { match: RegExp }> = [
  {
    id: "jeonggyeoun-try",
    name: "정겨운맛풍경 2호점",
    building: "판교트라이타워",
    location: "2층",
    category: "한식뷔페",
    match: /트라이타워|(?:맛\s*풍경|정겨운).*2호점/,
  },
  {
    id: "jeonggyeoun-growth",
    name: "정겨운맛풍경",
    building: "경기기업성장센터",
    location: "2층",
    category: "한식뷔페",
    match: /정겨운\s*맛\s*풍경|경기기업성장센터/,
  },
  {
    id: "bareun",
    name: "바른밥상",
    building: "판교이노베이션랩",
    location: "",
    category: "한식뷔페",
    match: /바른밥상|이노베[이]?션랩/,
  },
  {
    id: "haedamga",
    name: "해담가",
    building: "판교아이스퀘어",
    location: "107호",
    category: "한식뷔페",
    match: /해담가/,
  },
  {
    id: "lunch-for-you",
    name: "런치포유",
    building: "글로벌비즈센터",
    location: "B동 110호",
    category: "한식뷔페",
    match: /런치포유/,
  },
  {
    id: "eomni",
    name: "엄니한식뷔페",
    building: "판교아이스퀘어",
    location: "지하 1층",
    category: "한식뷔페",
    match: /엄니/,
  },
  {
    id: "songwon",
    name: "송원식당",
    building: "창업지원주택",
    location: "",
    category: "한식뷔페",
    match: /송원/,
  },
  {
    id: "hub",
    name: "기업지원허브 구내식당",
    building: "기업지원허브",
    location: "5층",
    category: "구내식당",
    match: /기업지원허브/,
  },
  {
    id: "software-dream",
    name: "소프트웨어드림센터 구내식당",
    building: "소프트웨어드림센터",
    location: "B동 지하 1층",
    category: "구내식당",
    match: /소프트웨어드림센터/,
  },
];

export function identifyRestaurant(title: string, articleId: number): Restaurant {
  const known = restaurants.find((restaurant) => restaurant.match.test(title));
  if (known) {
    return {
      id: known.id,
      name: known.name,
      building: known.building,
      location: known.location,
      category: known.category,
    };
  }
  const quoted = title.match(/["“‘「]([^"”’」]+)["”’」]/)?.[1];
  return {
    id: `article-${articleId}`,
    name: quoted || "새로운 점심 메뉴",
    building: "위치는 원문에서 확인해주세요",
    location: "",
    category: "식당",
  };
}
