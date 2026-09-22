export function LunchIllustration() {
  return (
    <svg viewBox="0 0 460 330" className="lunch-illustration" aria-hidden="true">
      <defs>
        <linearGradient id="tray" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#e8ecdf" />
          <stop offset="1" stopColor="#c5d0b8" />
        </linearGradient>
        <linearGradient id="rice" x1="0" y1="0" x2="0.6" y2="1">
          <stop stopColor="#fffef7" />
          <stop offset="1" stopColor="#f1eddb" />
        </linearGradient>
        <linearGradient id="bowl" x1="0" y1="0" x2="0.8" y2="1">
          <stop stopColor="#f9a078" />
          <stop offset="1" stopColor="#dc603d" />
        </linearGradient>
        <filter id="tray-shadow" x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow dx="3" dy="14" stdDeviation="11" floodColor="#595e42" floodOpacity=".16" />
        </filter>
        <filter id="food-shadow" x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#493818" floodOpacity=".15" />
        </filter>
      </defs>
      <ellipse cx="246" cy="284" rx="150" ry="19" fill="#d5d6bf" opacity=".3" />
      <g transform="translate(80 47) rotate(-12 150 117)" filter="url(#tray-shadow)">
        <rect x="0" y="0" width="304" height="224" rx="37" fill="#b5c2a8" />
        <rect x="0" y="-5" width="304" height="224" rx="37" fill="url(#tray)" stroke="#eef1e7" strokeWidth="3" />
        <rect x="14" y="9" width="276" height="196" rx="27" fill="none" stroke="#a7b69c" strokeWidth="2" opacity=".65" />
        <rect x="26" y="21" width="118" height="163" rx="30" fill="#b8c6aa" />
        <rect x="28" y="19" width="114" height="162" rx="29" fill="#f6f4e8" />
        <rect x="157" y="21" width="118" height="73" rx="22" fill="#b4c4a5" />
        <rect x="159" y="19" width="114" height="70" rx="21" fill="#d9e1ce" />
        <rect x="157" y="105" width="118" height="78" rx="22" fill="#b4c4a5" />
        <rect x="159" y="103" width="114" height="76" rx="21" fill="#e9e7d5" />
        <ellipse cx="86" cy="104" rx="48" ry="65" fill="url(#rice)" filter="url(#food-shadow)" />
        {[
          [58, 65, -20], [79, 57, 25], [98, 66, -30], [116, 83, 10],
          [54, 87, 20], [69, 77, -40], [91, 81, 25], [105, 96, -15],
          [52, 112, -15], [68, 105, 25], [87, 111, -25], [111, 118, 20],
          [60, 134, 30], [80, 134, -15], [96, 141, 35], [77, 151, 15],
        ].map(([x, y, rotation], index) => (
          <ellipse key={index} cx={x} cy={y} rx="3" ry="6" fill="#dfddc5" opacity=".4" transform={`rotate(${rotation} ${x} ${y})`} />
        ))}
        <g filter="url(#food-shadow)">
          <path d="M184 46c-14-10-13-22 0-19 2-15 14-16 17-4 12-10 20-2 13 9 16-3 21 9 6 15 12 8 6 18-7 13-3 12-15 12-18 2-14 7-21-3-11-16Z" fill="#689342" />
          <path d="M216 58c-11-11-5-22 7-14 7-15 18-10 16 2 14-7 20 4 9 13 15 1 12 14-1 14-4 12-16 13-18 1-14 3-21-8-13-16Z" fill="#426e35" />
          <path d="m197 37 4 21m24-6 10 14" stroke="#97b56e" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="250" cy="38" r="12" fill="#ed7750" />
          <path d="m245 29 6 8 5-7" fill="none" stroke="#72934e" strokeWidth="3" strokeLinecap="round" />
          <circle cx="246" cy="34" r="3" fill="#fda787" />
        </g>
        <g transform="translate(175 117) rotate(-9 41 20)" filter="url(#food-shadow)">
          <rect x="0" y="1" width="26" height="46" rx="8" fill="#a6663d" />
          <rect x="27" y="0" width="26" height="47" rx="8" fill="#bd7544" />
          <rect x="54" y="2" width="26" height="45" rx="8" fill="#a9683f" />
          <path d="m7 11 12 0m-12 10h12M34 9h12M34 21h12M61 13h12M61 26h12" stroke="#e5a575" strokeWidth="3" strokeLinecap="round" />
          <path d="m15 36 4-2m24 2 4 1m18 0 4-2" stroke="#f6e3bd" strokeWidth="2" strokeLinecap="round" />
          <path d="m36 31 7 4m12-24 5-5m-47 3 3-6" stroke="#699746" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g transform="translate(59 76)" filter="url(#food-shadow)">
          <path d="M10 16C0 6 12-6 24 1c15-11 28-1 25 9 17 0 23 17 11 25 2 16-17 20-27 13C17 58 1 44 9 34-3 29 0 18 10 16Z" fill="#fffef8" />
          <circle cx="32" cy="24" r="16" fill="#efb637" />
          <circle cx="29" cy="20" r="11" fill="#f5c94f" />
          <ellipse cx="26" cy="16" rx="4" ry="3" fill="#ffe58b" transform="rotate(-25 26 16)" />
        </g>
      </g>
      <g transform="translate(354 98) rotate(15)">
        <rect x="0" y="0" width="7" height="182" rx="3.5" fill="#aa7d54" />
        <rect x="2" y="0" width="3" height="181" rx="1.5" fill="#d3ad7e" />
        <rect x="16" y="2" width="7" height="181" rx="3.5" fill="#aa7d54" />
        <rect x="18" y="2" width="3" height="180" rx="1.5" fill="#d3ad7e" />
        <path d="M-6 133h36v16H-6z" fill="#ebe8dc" transform="rotate(-3 10 140)" />
      </g>
      <g transform="translate(40 202)" filter="url(#food-shadow)">
        <ellipse cx="36" cy="39" rx="39" ry="27" fill="#cf6447" />
        <path d="M-3 23h78c-3 29-14 43-39 43S0 51-3 23Z" fill="url(#bowl)" />
        <ellipse cx="36" cy="23" rx="40" ry="27" fill="#ffbc96" />
        <ellipse cx="36" cy="23" rx="33" ry="21" fill="#ae6440" />
        <ellipse cx="35" cy="20" rx="28" ry="17" fill="#bd7847" />
        <path d="m21 12 14 5m8 14 12-3m-33 6 8-4" stroke="#e7c28b" strokeWidth="6" strokeLinecap="round" />
        <path d="m43 11 6 5m-35 8 5 3m18 12 5-6" stroke="#6b8a46" strokeWidth="4" strokeLinecap="round" />
      </g>
      <path d="m67 81 3-11 4 11 11 4-11 3-4 11-3-11-11-3Z" fill="#ef966e" />
      <path d="m370 36 2-8 3 8 8 3-8 2-3 8-2-8-8-2Z" fill="#8eaa6d" />
      <path d="M397 229q17 5 7 18m1-29q16 0 14 14" fill="none" stroke="#d39366" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
