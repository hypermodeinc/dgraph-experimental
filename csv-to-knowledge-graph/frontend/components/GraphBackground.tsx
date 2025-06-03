'use client';

import React from 'react';

export default function GraphBackground() {
  return (
    <div className="fixed inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 930"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main connections - centered more toward the middle of the screen */}
        <line x1="490" y1="220" x2="680" y2="340" stroke="#9333ea" strokeOpacity="0.06" strokeWidth="1" />
        <line x1="680" y1="340" x2="850" y2="270" stroke="#9333ea" strokeOpacity="0.06" strokeWidth="1" />
        <line x1="850" y1="270" x2="940" y2="450" stroke="#9333ea" strokeOpacity="0.06" strokeWidth="1" />
        <line x1="940" y1="450" x2="780" y2="520" stroke="#9333ea" strokeOpacity="0.06" strokeWidth="1" />
        <line x1="780" y1="520" x2="680" y2="340" stroke="#9333ea" strokeOpacity="0.06" strokeWidth="1" />
        <line x1="490" y1="220" x2="320" y2="380" stroke="#9333ea" strokeOpacity="0.06" strokeWidth="1" />
        <line x1="320" y1="380" x2="440" y2="560" stroke="#9333ea" strokeOpacity="0.06" strokeWidth="1" />
        <line x1="440" y1="560" x2="600" y2="630" stroke="#9333ea" strokeOpacity="0.06" strokeWidth="1" />
        <line x1="600" y1="630" x2="780" y2="520" stroke="#9333ea" strokeOpacity="0.06" strokeWidth="1" />
        <line x1="600" y1="630" x2="720" y2="780" stroke="#9333ea" strokeOpacity="0.05" strokeWidth="1" />
        <line x1="720" y1="780" x2="880" y2="740" stroke="#9333ea" strokeOpacity="0.05" strokeWidth="1" />
        <line x1="880" y1="740" x2="980" y2="580" stroke="#9333ea" strokeOpacity="0.05" strokeWidth="1" />
        <line x1="980" y1="580" x2="940" y2="450" stroke="#9333ea" strokeOpacity="0.05" strokeWidth="1" />
        <line x1="780" y1="520" x2="980" y2="580" stroke="#9333ea" strokeOpacity="0.05" strokeWidth="1" />

        {/* Left side connections - shifted right for better centering */}
        <line x1="320" y1="380" x2="250" y2="580" stroke="#9333ea" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="250" y1="580" x2="330" y2="750" stroke="#9333ea" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="330" y1="750" x2="540" y2="730" stroke="#9333ea" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="540" y1="730" x2="600" y2="630" stroke="#9333ea" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="540" y1="730" x2="720" y2="780" stroke="#9333ea" strokeOpacity="0.04" strokeWidth="1" />

        {/* Upper connections - filling in the center top area */}
        <line x1="490" y1="220" x2="590" y2="120" stroke="#9333ea" strokeOpacity="0.05" strokeWidth="1" />
        <line x1="590" y1="120" x2="720" y2="170" stroke="#9333ea" strokeOpacity="0.05" strokeWidth="1" />
        <line x1="720" y1="170" x2="850" y2="270" stroke="#9333ea" strokeOpacity="0.05" strokeWidth="1" />
        <line x1="720" y1="170" x2="680" y2="340" stroke="#9333ea" strokeOpacity="0.05" strokeWidth="1" />

        {/* Right side connections - shifted left for better centering */}
        <line x1="980" y1="580" x2="1060" y2="680" stroke="#9333ea" strokeOpacity="0.04" strokeWidth="1" />
        <line x1="1060" y1="680" x2="940" y2="800" stroke="#9333ea" strokeOpacity="0.03" strokeWidth="1" />
        <line x1="940" y1="800" x2="760" y2="850" stroke="#9333ea" strokeOpacity="0.03" strokeWidth="1" />
        <line x1="760" y1="850" x2="720" y2="780" stroke="#9333ea" strokeOpacity="0.03" strokeWidth="1" />

        {/* Primary nodes - better centered on the screen */}
        <circle cx="490" cy="220" r="14" fill="#9333ea" fillOpacity="0.11" />
        <circle cx="680" cy="340" r="19" fill="#9333ea" fillOpacity="0.13" />
        <circle cx="850" cy="270" r="16" fill="#9333ea" fillOpacity="0.11" />
        <circle cx="940" cy="450" r="20" fill="#9333ea" fillOpacity="0.12" />
        <circle cx="780" cy="520" r="17" fill="#9333ea" fillOpacity="0.12" />
        <circle cx="320" cy="380" r="15" fill="#9333ea" fillOpacity="0.1" />
        <circle cx="440" cy="560" r="18" fill="#9333ea" fillOpacity="0.11" />
        <circle cx="600" cy="630" r="16" fill="#9333ea" fillOpacity="0.11" />
        <circle cx="720" cy="780" r="18" fill="#9333ea" fillOpacity="0.09" />
        <circle cx="880" cy="740" r="14" fill="#9333ea" fillOpacity="0.09" />
        <circle cx="980" cy="580" r="17" fill="#9333ea" fillOpacity="0.1" />

        {/* Center top nodes */}
        <circle cx="590" cy="120" r="13" fill="#9333ea" fillOpacity="0.09" />
        <circle cx="720" cy="170" r="16" fill="#9333ea" fillOpacity="0.1" />

        {/* Secondary nodes - redistributed for better balance */}
        <circle cx="250" cy="580" r="13" fill="#9333ea" fillOpacity="0.08" />
        <circle cx="330" cy="750" r="15" fill="#9333ea" fillOpacity="0.08" />
        <circle cx="540" cy="730" r="12" fill="#9333ea" fillOpacity="0.08" />
        <circle cx="1060" cy="680" r="15" fill="#9333ea" fillOpacity="0.08" />
        <circle cx="940" cy="800" r="12" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="760" cy="850" r="14" fill="#9333ea" fillOpacity="0.06" />

        {/* Small accent nodes - distributed more evenly across the canvas */}
        <circle cx="540" cy="180" r="6" fill="#9333ea" fillOpacity="0.08" />
        <circle cx="650" cy="230" r="5" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="780" cy="370" r="7" fill="#9333ea" fillOpacity="0.08" />
        <circle cx="870" cy="350" r="4" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="930" cy="420" r="5" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="860" cy="520" r="6" fill="#9333ea" fillOpacity="0.08" />
        <circle cx="690" cy="470" r="4" fill="#9333ea" fillOpacity="0.08" />
        <circle cx="540" cy="480" r="5" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="390" cy="470" r="7" fill="#9333ea" fillOpacity="0.08" />
        <circle cx="370" cy="300" r="4" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="480" cy="650" r="6" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="630" cy="720" r="5" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="820" cy="640" r="7" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="910" cy="640" r="4" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="400" cy="190" r="5" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="800" cy="200" r="6" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="900" cy="320" r="4" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="1020" cy="600" r="5" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="1000" cy="530" r="7" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="850" cy="680" r="4" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="720" cy="800" r="5" fill="#9333ea" fillOpacity="0.05" />
        <circle cx="580" cy="830" r="6" fill="#9333ea" fillOpacity="0.05" />
        <circle cx="420" cy="820" r="4" fill="#9333ea" fillOpacity="0.05" />
        <circle cx="420" cy="670" r="5" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="330" cy="520" r="6" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="240" cy="440" r="4" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="260" cy="660" r="5" fill="#9333ea" fillOpacity="0.05" />
        <circle cx="360" cy="780" r="4" fill="#9333ea" fillOpacity="0.05" />
        <circle cx="490" cy="820" r="5" fill="#9333ea" fillOpacity="0.04" />
        <circle cx="680" cy="870" r="6" fill="#9333ea" fillOpacity="0.04" />
        <circle cx="840" cy="820" r="4" fill="#9333ea" fillOpacity="0.04" />
        <circle cx="1020" cy="720" r="5" fill="#9333ea" fillOpacity="0.05" />
        <circle cx="950" cy="700" r="6" fill="#9333ea" fillOpacity="0.04" />
        <circle cx="1050" cy="520" r="4" fill="#9333ea" fillOpacity="0.04" />
        <circle cx="1090" cy="390" r="5" fill="#9333ea" fillOpacity="0.05" />
        <circle cx="960" cy="230" r="6" fill="#9333ea" fillOpacity="0.05" />
        <circle cx="810" cy="180" r="4" fill="#9333ea" fillOpacity="0.05" />
        <circle cx="690" cy="150" r="5" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="620" cy="260" r="6" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="570" cy="120" r="4" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="470" cy="110" r="5" fill="#9333ea" fillOpacity="0.05" />
        <circle cx="380" cy="160" r="6" fill="#9333ea" fillOpacity="0.05" />
        <circle cx="290" cy="320" r="4" fill="#9333ea" fillOpacity="0.06" />

        {/* Additional nodes for balance in central area */}
        <circle cx="550" cy="380" r="5" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="620" cy="420" r="4" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="710" cy="400" r="6" fill="#9333ea" fillOpacity="0.08" />
        <circle cx="780" cy="450" r="5" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="700" cy="560" r="4" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="520" cy="580" r="6" fill="#9333ea" fillOpacity="0.06" />
        <circle cx="500" cy="430" r="5" fill="#9333ea" fillOpacity="0.07" />
        <circle cx="390" cy="400" r="4" fill="#9333ea" fillOpacity="0.06" />
      </svg>
    </div>
  );
}
