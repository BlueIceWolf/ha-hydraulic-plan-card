const { HydraulicPlanCard, HydraulicPlanCardEditor } = (function hpcUI() {
  // Self-contained Buderus WPLS 13.2 SVG, including both centred rotors.
  const HPC_WPLS_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"buderus-wpls132\" x=\"124\" y=\"218\" width=\"92\" height=\"131\" viewBox=\"0 0 360 510\" aria-hidden=\"true\">\n<title id=\"hpc-wpls-wp-title\">Buderus WPLS 13.2 – Außengerät</title>\n<desc id=\"hpc-wpls-wp-desc\">Zweiflügeliges weißes Wärmepumpen-Außengerät mit zwei übereinander angeordneten Ventilatoren. Durch Hinzufügen der CSS-Klasse running drehen sich die Ventilatorrotoren.</desc>\n<defs>\n <linearGradient id=\"hpc-wpls-cabinet\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"0\"><stop stop-color=\"#e0dfdb\"/><stop offset=\".08\" stop-color=\"#faf9f6\"/><stop offset=\".48\" stop-color=\"#eeeae5\"/><stop offset=\".88\" stop-color=\"#d8d6d2\"/><stop offset=\"1\" stop-color=\"#c9c6c2\"/></linearGradient>\n <linearGradient id=\"hpc-wpls-right-panel\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"0\"><stop stop-color=\"#d3d0cb\"/><stop offset=\".10\" stop-color=\"#f3f0eb\"/><stop offset=\".85\" stop-color=\"#e6e3de\"/><stop offset=\"1\" stop-color=\"#cac7c1\"/></linearGradient>\n <radialGradient id=\"hpc-wpls-fan-well\"><stop stop-color=\"#15191c\"/><stop offset=\".65\" stop-color=\"#202629\"/><stop offset=\".95\" stop-color=\"#30373b\"/><stop offset=\"1\" stop-color=\"#0d1114\"/></radialGradient>\n <linearGradient id=\"hpc-wpls-blade\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"1\"><stop stop-color=\"#4b5558\"/><stop offset=\".5\" stop-color=\"#272e32\"/><stop offset=\"1\" stop-color=\"#0f1519\"/></linearGradient>\n <linearGradient id=\"hpc-wpls-grill\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"0\"><stop stop-color=\"#b9bbb9\"/><stop offset=\".5\" stop-color=\"#eff0ee\"/><stop offset=\"1\" stop-color=\"#747b7d\"/></linearGradient>\n <clipPath id=\"hpc-wpls-well1\"><circle cx=\"132\" cy=\"139\" r=\"99\"/></clipPath>\n <clipPath id=\"hpc-wpls-well2\"><circle cx=\"132\" cy=\"361\" r=\"99\"/></clipPath>\n <style><![CDATA[\n  .buderus-wpls132 .rotor {transform-box:view-box;animation:hpc-wpls-spin 2.3s linear infinite;animation-play-state:paused;}\n  .buderus-wpls132.running .rotor {animation-play-state:running;}\n  .buderus-wpls132 .rotor.top {transform-origin:132px 139px;}\n  .buderus-wpls132 .rotor.bottom {transform-origin:132px 361px;}\n  .buderus-wpls132 .status-light {fill:#8d9699;}\n  .buderus-wpls132.running .status-light {fill:#36ac78;}\n  .buderus-wpls132.fault .status-light {fill:#e04e4e;}\n  .buderus-wpls132.fault .rotor {animation-play-state:paused;}\n  @keyframes hpc-wpls-spin {from {transform:rotate(0deg)}to{transform:rotate(360deg)}}\n  @media (prefers-reduced-motion:reduce){.buderus-wpls132 .rotor{animation-duration:12s}}\n ]]></style>\n</defs>\n<!-- Outer cabinet -->\n<path d=\"M24 16H333Q339 16 339 22V484Q339 490 333 490H24Q19 490 19 484V22Q19 16 24 16Z\" fill=\"url(#hpc-wpls-cabinet)\" stroke=\"#a5a5a0\" stroke-width=\"1.25\"/>\n<path d=\"M19 27H339\" stroke=\"#b8b6b1\" stroke-width=\"2\"/>\n<path d=\"M23 21H336\" stroke=\"#fff\" stroke-opacity=\".88\"/>\n<path d=\"M22 27V482\" stroke=\"#fefdfb\" stroke-width=\"2.5\" opacity=\".7\"/>\n<path d=\"M338 28V482\" stroke=\"#979a99\" opacity=\".5\"/>\n<path d=\"M24 490H334\" stroke=\"#a19e9b\" stroke-width=\"1.4\"/>\n<!-- Long right maintenance panel -->\n<path d=\"M231 28H338V486H232Q229 484 229 481V33Q229 28 231 28Z\" fill=\"url(#hpc-wpls-right-panel)\" stroke=\"#c6c3be\"/>\n<path d=\"M230 30V483\" stroke=\"#fff\" stroke-opacity=\".6\" stroke-width=\"1.7\"/>\n<path d=\"M237 28V485\" stroke=\"#b2b0ac\" opacity=\".65\"/>\n<!-- two fan inset trays -->\n\n<rect x=\"31\" y=\"35\" width=\"202\" height=\"208\" rx=\"3.5\" fill=\"#a5aaa9\" stroke=\"#c5c8c5\" stroke-width=\"1.4\"/>\n<rect x=\"36\" y=\"40\" width=\"192\" height=\"198\" rx=\"2\" fill=\"#161b1e\" stroke=\"#c2c5c4\" stroke-width=\"1.2\"/>\n<circle cx=\"132\" cy=\"139\" r=\"99\" fill=\"url(#hpc-wpls-fan-well)\"/>\n<path d=\"M132.00 139.00 L132.00 233.00\" stroke=\"#252c30\" stroke-width=\"11\" opacity=\".72\"/>\n<path d=\"M132.00 139.00 L50.59 92.00\" stroke=\"#252c30\" stroke-width=\"11\" opacity=\".72\"/>\n<path d=\"M132.00 139.00 L213.41 92.00\" stroke=\"#252c30\" stroke-width=\"11\" opacity=\".72\"/>\n<g class=\"rotor top\">\n<path d=\"M136 132 C144 114 168 73 198 67 C213 63 220 73 211 86 C198 111 169 129 140 145 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(0.00 132 139)\"/>\n<path d=\"M136 132 C144 114 168 73 198 67 C213 63 220 73 211 86 C198 111 169 129 140 145 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(51.43 132 139)\"/>\n<path d=\"M136 132 C144 114 168 73 198 67 C213 63 220 73 211 86 C198 111 169 129 140 145 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(102.86 132 139)\"/>\n<path d=\"M136 132 C144 114 168 73 198 67 C213 63 220 73 211 86 C198 111 169 129 140 145 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(154.29 132 139)\"/>\n<path d=\"M136 132 C144 114 168 73 198 67 C213 63 220 73 211 86 C198 111 169 129 140 145 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(205.71 132 139)\"/>\n<path d=\"M136 132 C144 114 168 73 198 67 C213 63 220 73 211 86 C198 111 169 129 140 145 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(257.14 132 139)\"/>\n<path d=\"M136 132 C144 114 168 73 198 67 C213 63 220 73 211 86 C198 111 169 129 140 145 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(308.57 132 139)\"/>\n<circle cx=\"132\" cy=\"139\" r=\"19\" fill=\"#333b3e\" stroke=\"#697174\" stroke-width=\"2\"/>\n<circle cx=\"132\" cy=\"139\" r=\"7\" fill=\"#22282a\" stroke=\"#899295\" stroke-width=\"1\"/>\n</g>\n<g fill=\"none\" stroke=\"url(#hpc-wpls-grill)\" opacity=\".9\" stroke-linecap=\"round\">\n<circle cx=\"132\" cy=\"139\" r=\"13\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"139\" r=\"21\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"139\" r=\"29\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"139\" r=\"37\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"139\" r=\"45\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"139\" r=\"53\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"139\" r=\"61\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"139\" r=\"69\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"139\" r=\"77\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"139\" r=\"85\" stroke-width=\"1.25\"/>\n<circle cx=\"132\" cy=\"139\" r=\"93\" stroke-width=\"1.25\"/>\n<path d=\"M145.00 139.00 Q187.79 143.88 225.03 172.86\" stroke-width=\".87\"/>\n<path d=\"M144.92 140.46 Q186.89 150.10 220.65 183.06\" stroke-width=\".87\"/>\n<path d=\"M144.67 141.89 Q185.30 156.17 215.16 192.71\" stroke-width=\".87\"/>\n<path d=\"M144.27 143.29 Q183.04 162.03 208.63 201.69\" stroke-width=\".87\"/>\n<path d=\"M143.71 144.64 Q180.14 167.60 201.13 209.87\" stroke-width=\".87\"/>\n<path d=\"M143.01 145.92 Q176.64 172.81 192.76 217.16\" stroke-width=\".87\"/>\n<path d=\"M142.16 147.11 Q172.57 177.60 183.62 223.48\" stroke-width=\".87\"/>\n<path d=\"M141.19 148.19 Q168.00 181.90 173.84 228.72\" stroke-width=\".87\"/>\n<path d=\"M140.11 149.16 Q162.97 185.66 163.53 232.84\" stroke-width=\".87\"/>\n<path d=\"M138.92 150.01 Q157.55 188.83 152.82 235.78\" stroke-width=\".87\"/>\n<path d=\"M137.64 150.71 Q151.81 191.38 141.86 237.51\" stroke-width=\".87\"/>\n<path d=\"M136.29 151.27 Q145.82 193.27 130.77 237.99\" stroke-width=\".87\"/>\n<path d=\"M134.89 151.67 Q139.66 194.47 119.69 237.23\" stroke-width=\".87\"/>\n<path d=\"M133.46 151.92 Q133.40 194.98 108.77 235.24\" stroke-width=\".87\"/>\n<path d=\"M132.00 152.00 Q127.12 194.79 98.14 232.03\" stroke-width=\".87\"/>\n<path d=\"M130.54 151.92 Q120.90 193.89 87.94 227.65\" stroke-width=\".87\"/>\n<path d=\"M129.11 151.67 Q114.83 192.30 78.29 222.16\" stroke-width=\".87\"/>\n<path d=\"M127.71 151.27 Q108.97 190.04 69.31 215.63\" stroke-width=\".87\"/>\n<path d=\"M126.36 150.71 Q103.40 187.14 61.13 208.13\" stroke-width=\".87\"/>\n<path d=\"M125.08 150.01 Q98.19 183.64 53.84 199.76\" stroke-width=\".87\"/>\n<path d=\"M123.89 149.16 Q93.40 179.57 47.52 190.62\" stroke-width=\".87\"/>\n<path d=\"M122.81 148.19 Q89.10 175.00 42.28 180.84\" stroke-width=\".87\"/>\n<path d=\"M121.84 147.11 Q85.34 169.97 38.16 170.53\" stroke-width=\".87\"/>\n<path d=\"M120.99 145.92 Q82.17 164.55 35.22 159.82\" stroke-width=\".87\"/>\n<path d=\"M120.29 144.64 Q79.62 158.81 33.49 148.86\" stroke-width=\".87\"/>\n<path d=\"M119.73 143.29 Q77.73 152.82 33.01 137.77\" stroke-width=\".87\"/>\n<path d=\"M119.33 141.89 Q76.53 146.66 33.77 126.69\" stroke-width=\".87\"/>\n<path d=\"M119.08 140.46 Q76.02 140.40 35.76 115.77\" stroke-width=\".87\"/>\n<path d=\"M119.00 139.00 Q76.21 134.12 38.97 105.14\" stroke-width=\".87\"/>\n<path d=\"M119.08 137.54 Q77.11 127.90 43.35 94.94\" stroke-width=\".87\"/>\n<path d=\"M119.33 136.11 Q78.70 121.83 48.84 85.29\" stroke-width=\".87\"/>\n<path d=\"M119.73 134.71 Q80.96 115.97 55.37 76.31\" stroke-width=\".87\"/>\n<path d=\"M120.29 133.36 Q83.86 110.40 62.87 68.13\" stroke-width=\".87\"/>\n<path d=\"M120.99 132.08 Q87.36 105.19 71.24 60.84\" stroke-width=\".87\"/>\n<path d=\"M121.84 130.89 Q91.43 100.40 80.38 54.52\" stroke-width=\".87\"/>\n<path d=\"M122.81 129.81 Q96.00 96.10 90.16 49.28\" stroke-width=\".87\"/>\n<path d=\"M123.89 128.84 Q101.03 92.34 100.47 45.16\" stroke-width=\".87\"/>\n<path d=\"M125.08 127.99 Q106.45 89.17 111.18 42.22\" stroke-width=\".87\"/>\n<path d=\"M126.36 127.29 Q112.19 86.62 122.14 40.49\" stroke-width=\".87\"/>\n<path d=\"M127.71 126.73 Q118.18 84.73 133.23 40.01\" stroke-width=\".87\"/>\n<path d=\"M129.11 126.33 Q124.34 83.53 144.31 40.77\" stroke-width=\".87\"/>\n<path d=\"M130.54 126.08 Q130.60 83.02 155.23 42.76\" stroke-width=\".87\"/>\n<path d=\"M132.00 126.00 Q136.88 83.21 165.86 45.97\" stroke-width=\".87\"/>\n<path d=\"M133.46 126.08 Q143.10 84.11 176.06 50.35\" stroke-width=\".87\"/>\n<path d=\"M134.89 126.33 Q149.17 85.70 185.71 55.84\" stroke-width=\".87\"/>\n<path d=\"M136.29 126.73 Q155.03 87.96 194.69 62.37\" stroke-width=\".87\"/>\n<path d=\"M137.64 127.29 Q160.60 90.86 202.87 69.87\" stroke-width=\".87\"/>\n<path d=\"M138.92 127.99 Q165.81 94.36 210.16 78.24\" stroke-width=\".87\"/>\n<path d=\"M140.11 128.84 Q170.60 98.43 216.48 87.38\" stroke-width=\".87\"/>\n<path d=\"M141.19 129.81 Q174.90 103.00 221.72 97.16\" stroke-width=\".87\"/>\n<path d=\"M142.16 130.89 Q178.66 108.03 225.84 107.47\" stroke-width=\".87\"/>\n<path d=\"M143.01 132.08 Q181.83 113.45 228.78 118.18\" stroke-width=\".87\"/>\n<path d=\"M143.71 133.36 Q184.38 119.19 230.51 129.14\" stroke-width=\".87\"/>\n<path d=\"M144.27 134.71 Q186.27 125.18 230.99 140.23\" stroke-width=\".87\"/>\n<path d=\"M144.67 136.11 Q187.47 131.34 230.23 151.31\" stroke-width=\".87\"/>\n<path d=\"M144.92 137.54 Q187.98 137.60 228.24 162.23\" stroke-width=\".87\"/>\n</g>\n<circle cx=\"132\" cy=\"139\" r=\"10\" fill=\"#d6d8d6\" stroke=\"#8b9393\" stroke-width=\"1.7\"/>\n<circle cx=\"132\" cy=\"139\" r=\"97.5\" fill=\"none\" stroke=\"#c1c3c1\" stroke-width=\"2.6\"/>\n<circle cx=\"40\" cy=\"46\" r=\"3.1\" fill=\"#34383b\" stroke=\"#d9dad7\" stroke-width=\"1.0\"/><path d=\"M38.9 46h2.2\" stroke=\"#aaa\" stroke-width=\".6\"/>\n<circle cx=\"40\" cy=\"231\" r=\"3.1\" fill=\"#34383b\" stroke=\"#d9dad7\" stroke-width=\"1.0\"/><path d=\"M38.9 231h2.2\" stroke=\"#aaa\" stroke-width=\".6\"/>\n<circle cx=\"224\" cy=\"46\" r=\"3.1\" fill=\"#34383b\" stroke=\"#d9dad7\" stroke-width=\"1.0\"/><path d=\"M222.9 46h2.2\" stroke=\"#aaa\" stroke-width=\".6\"/>\n<circle cx=\"224\" cy=\"231\" r=\"3.1\" fill=\"#34383b\" stroke=\"#d9dad7\" stroke-width=\"1.0\"/><path d=\"M222.9 231h2.2\" stroke=\"#aaa\" stroke-width=\".6\"/>\n<rect x=\"31\" y=\"35\" width=\"202\" height=\"208\" rx=\"3.5\" fill=\"none\" stroke=\"#ededeb\" stroke-width=\"1.5\"/>\n<rect x=\"31\" y=\"257\" width=\"202\" height=\"208\" rx=\"3.5\" fill=\"#a5aaa9\" stroke=\"#c5c8c5\" stroke-width=\"1.4\"/>\n<rect x=\"36\" y=\"262\" width=\"192\" height=\"198\" rx=\"2\" fill=\"#161b1e\" stroke=\"#c2c5c4\" stroke-width=\"1.2\"/>\n<circle cx=\"132\" cy=\"361\" r=\"99\" fill=\"url(#hpc-wpls-fan-well)\"/>\n<path d=\"M132.00 361.00 L132.00 455.00\" stroke=\"#252c30\" stroke-width=\"11\" opacity=\".72\"/>\n<path d=\"M132.00 361.00 L50.59 314.00\" stroke=\"#252c30\" stroke-width=\"11\" opacity=\".72\"/>\n<path d=\"M132.00 361.00 L213.41 314.00\" stroke=\"#252c30\" stroke-width=\"11\" opacity=\".72\"/>\n<g class=\"rotor bottom\">\n<path d=\"M136 354 C144 336 168 295 198 289 C213 285 220 295 211 308 C198 333 169 351 140 367 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(0.00 132 361)\"/>\n<path d=\"M136 354 C144 336 168 295 198 289 C213 285 220 295 211 308 C198 333 169 351 140 367 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(51.43 132 361)\"/>\n<path d=\"M136 354 C144 336 168 295 198 289 C213 285 220 295 211 308 C198 333 169 351 140 367 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(102.86 132 361)\"/>\n<path d=\"M136 354 C144 336 168 295 198 289 C213 285 220 295 211 308 C198 333 169 351 140 367 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(154.29 132 361)\"/>\n<path d=\"M136 354 C144 336 168 295 198 289 C213 285 220 295 211 308 C198 333 169 351 140 367 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(205.71 132 361)\"/>\n<path d=\"M136 354 C144 336 168 295 198 289 C213 285 220 295 211 308 C198 333 169 351 140 367 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(257.14 132 361)\"/>\n<path d=\"M136 354 C144 336 168 295 198 289 C213 285 220 295 211 308 C198 333 169 351 140 367 Z\" fill=\"url(#hpc-wpls-blade)\" stroke=\"#525a5c\" stroke-width=\".85\" transform=\"rotate(308.57 132 361)\"/>\n<circle cx=\"132\" cy=\"361\" r=\"19\" fill=\"#333b3e\" stroke=\"#697174\" stroke-width=\"2\"/>\n<circle cx=\"132\" cy=\"361\" r=\"7\" fill=\"#22282a\" stroke=\"#899295\" stroke-width=\"1\"/>\n</g>\n<g fill=\"none\" stroke=\"url(#hpc-wpls-grill)\" opacity=\".9\" stroke-linecap=\"round\">\n<circle cx=\"132\" cy=\"361\" r=\"13\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"361\" r=\"21\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"361\" r=\"29\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"361\" r=\"37\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"361\" r=\"45\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"361\" r=\"53\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"361\" r=\"61\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"361\" r=\"69\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"361\" r=\"77\" stroke-width=\"1.0\"/>\n<circle cx=\"132\" cy=\"361\" r=\"85\" stroke-width=\"1.25\"/>\n<circle cx=\"132\" cy=\"361\" r=\"93\" stroke-width=\"1.25\"/>\n<path d=\"M145.00 361.00 Q187.79 365.88 225.03 394.86\" stroke-width=\".87\"/>\n<path d=\"M144.92 362.46 Q186.89 372.10 220.65 405.06\" stroke-width=\".87\"/>\n<path d=\"M144.67 363.89 Q185.30 378.17 215.16 414.71\" stroke-width=\".87\"/>\n<path d=\"M144.27 365.29 Q183.04 384.03 208.63 423.69\" stroke-width=\".87\"/>\n<path d=\"M143.71 366.64 Q180.14 389.60 201.13 431.87\" stroke-width=\".87\"/>\n<path d=\"M143.01 367.92 Q176.64 394.81 192.76 439.16\" stroke-width=\".87\"/>\n<path d=\"M142.16 369.11 Q172.57 399.60 183.62 445.48\" stroke-width=\".87\"/>\n<path d=\"M141.19 370.19 Q168.00 403.90 173.84 450.72\" stroke-width=\".87\"/>\n<path d=\"M140.11 371.16 Q162.97 407.66 163.53 454.84\" stroke-width=\".87\"/>\n<path d=\"M138.92 372.01 Q157.55 410.83 152.82 457.78\" stroke-width=\".87\"/>\n<path d=\"M137.64 372.71 Q151.81 413.38 141.86 459.51\" stroke-width=\".87\"/>\n<path d=\"M136.29 373.27 Q145.82 415.27 130.77 459.99\" stroke-width=\".87\"/>\n<path d=\"M134.89 373.67 Q139.66 416.47 119.69 459.23\" stroke-width=\".87\"/>\n<path d=\"M133.46 373.92 Q133.40 416.98 108.77 457.24\" stroke-width=\".87\"/>\n<path d=\"M132.00 374.00 Q127.12 416.79 98.14 454.03\" stroke-width=\".87\"/>\n<path d=\"M130.54 373.92 Q120.90 415.89 87.94 449.65\" stroke-width=\".87\"/>\n<path d=\"M129.11 373.67 Q114.83 414.30 78.29 444.16\" stroke-width=\".87\"/>\n<path d=\"M127.71 373.27 Q108.97 412.04 69.31 437.63\" stroke-width=\".87\"/>\n<path d=\"M126.36 372.71 Q103.40 409.14 61.13 430.13\" stroke-width=\".87\"/>\n<path d=\"M125.08 372.01 Q98.19 405.64 53.84 421.76\" stroke-width=\".87\"/>\n<path d=\"M123.89 371.16 Q93.40 401.57 47.52 412.62\" stroke-width=\".87\"/>\n<path d=\"M122.81 370.19 Q89.10 397.00 42.28 402.84\" stroke-width=\".87\"/>\n<path d=\"M121.84 369.11 Q85.34 391.97 38.16 392.53\" stroke-width=\".87\"/>\n<path d=\"M120.99 367.92 Q82.17 386.55 35.22 381.82\" stroke-width=\".87\"/>\n<path d=\"M120.29 366.64 Q79.62 380.81 33.49 370.86\" stroke-width=\".87\"/>\n<path d=\"M119.73 365.29 Q77.73 374.82 33.01 359.77\" stroke-width=\".87\"/>\n<path d=\"M119.33 363.89 Q76.53 368.66 33.77 348.69\" stroke-width=\".87\"/>\n<path d=\"M119.08 362.46 Q76.02 362.40 35.76 337.77\" stroke-width=\".87\"/>\n<path d=\"M119.00 361.00 Q76.21 356.12 38.97 327.14\" stroke-width=\".87\"/>\n<path d=\"M119.08 359.54 Q77.11 349.90 43.35 316.94\" stroke-width=\".87\"/>\n<path d=\"M119.33 358.11 Q78.70 343.83 48.84 307.29\" stroke-width=\".87\"/>\n<path d=\"M119.73 356.71 Q80.96 337.97 55.37 298.31\" stroke-width=\".87\"/>\n<path d=\"M120.29 355.36 Q83.86 332.40 62.87 290.13\" stroke-width=\".87\"/>\n<path d=\"M120.99 354.08 Q87.36 327.19 71.24 282.84\" stroke-width=\".87\"/>\n<path d=\"M121.84 352.89 Q91.43 322.40 80.38 276.52\" stroke-width=\".87\"/>\n<path d=\"M122.81 351.81 Q96.00 318.10 90.16 271.28\" stroke-width=\".87\"/>\n<path d=\"M123.89 350.84 Q101.03 314.34 100.47 267.16\" stroke-width=\".87\"/>\n<path d=\"M125.08 349.99 Q106.45 311.17 111.18 264.22\" stroke-width=\".87\"/>\n<path d=\"M126.36 349.29 Q112.19 308.62 122.14 262.49\" stroke-width=\".87\"/>\n<path d=\"M127.71 348.73 Q118.18 306.73 133.23 262.01\" stroke-width=\".87\"/>\n<path d=\"M129.11 348.33 Q124.34 305.53 144.31 262.77\" stroke-width=\".87\"/>\n<path d=\"M130.54 348.08 Q130.60 305.02 155.23 264.76\" stroke-width=\".87\"/>\n<path d=\"M132.00 348.00 Q136.88 305.21 165.86 267.97\" stroke-width=\".87\"/>\n<path d=\"M133.46 348.08 Q143.10 306.11 176.06 272.35\" stroke-width=\".87\"/>\n<path d=\"M134.89 348.33 Q149.17 307.70 185.71 277.84\" stroke-width=\".87\"/>\n<path d=\"M136.29 348.73 Q155.03 309.96 194.69 284.37\" stroke-width=\".87\"/>\n<path d=\"M137.64 349.29 Q160.60 312.86 202.87 291.87\" stroke-width=\".87\"/>\n<path d=\"M138.92 349.99 Q165.81 316.36 210.16 300.24\" stroke-width=\".87\"/>\n<path d=\"M140.11 350.84 Q170.60 320.43 216.48 309.38\" stroke-width=\".87\"/>\n<path d=\"M141.19 351.81 Q174.90 325.00 221.72 319.16\" stroke-width=\".87\"/>\n<path d=\"M142.16 352.89 Q178.66 330.03 225.84 329.47\" stroke-width=\".87\"/>\n<path d=\"M143.01 354.08 Q181.83 335.45 228.78 340.18\" stroke-width=\".87\"/>\n<path d=\"M143.71 355.36 Q184.38 341.19 230.51 351.14\" stroke-width=\".87\"/>\n<path d=\"M144.27 356.71 Q186.27 347.18 230.99 362.23\" stroke-width=\".87\"/>\n<path d=\"M144.67 358.11 Q187.47 353.34 230.23 373.31\" stroke-width=\".87\"/>\n<path d=\"M144.92 359.54 Q187.98 359.60 228.24 384.23\" stroke-width=\".87\"/>\n</g>\n<circle cx=\"132\" cy=\"361\" r=\"10\" fill=\"#d6d8d6\" stroke=\"#8b9393\" stroke-width=\"1.7\"/>\n<circle cx=\"132\" cy=\"361\" r=\"97.5\" fill=\"none\" stroke=\"#c1c3c1\" stroke-width=\"2.6\"/>\n<circle cx=\"40\" cy=\"268\" r=\"3.1\" fill=\"#34383b\" stroke=\"#d9dad7\" stroke-width=\"1.0\"/><path d=\"M38.9 268h2.2\" stroke=\"#aaa\" stroke-width=\".6\"/>\n<circle cx=\"40\" cy=\"453\" r=\"3.1\" fill=\"#34383b\" stroke=\"#d9dad7\" stroke-width=\"1.0\"/><path d=\"M38.9 453h2.2\" stroke=\"#aaa\" stroke-width=\".6\"/>\n<circle cx=\"224\" cy=\"268\" r=\"3.1\" fill=\"#34383b\" stroke=\"#d9dad7\" stroke-width=\"1.0\"/><path d=\"M222.9 268h2.2\" stroke=\"#aaa\" stroke-width=\".6\"/>\n<circle cx=\"224\" cy=\"453\" r=\"3.1\" fill=\"#34383b\" stroke=\"#d9dad7\" stroke-width=\"1.0\"/><path d=\"M222.9 453h2.2\" stroke=\"#aaa\" stroke-width=\".6\"/>\n<rect x=\"31\" y=\"257\" width=\"202\" height=\"208\" rx=\"3.5\" fill=\"none\" stroke=\"#ededeb\" stroke-width=\"1.5\"/>\n<!-- right side detailing -->\n<text x=\"249\" y=\"65\" font-size=\"18\" font-family=\"Arial,Helvetica,sans-serif\" font-weight=\"700\" letter-spacing=\"-.65\" fill=\"#202225\">Buderus</text>\n<rect x=\"252\" y=\"116\" width=\"72\" height=\"2\" rx=\"1\" fill=\"#f7f5f2\" opacity=\".8\"/>\n<rect x=\"247\" y=\"189\" width=\"75\" height=\"2\" rx=\"1\" fill=\"#f8f6f3\" opacity=\".9\"/>\n<path d=\"M250 193H323\" stroke=\"#bbb9b5\" stroke-width=\".65\" opacity=\".6\"/>\n<rect x=\"248\" y=\"272\" width=\"76\" height=\"2\" rx=\"1\" fill=\"#f8f6f3\" opacity=\".9\"/>\n<path d=\"M251 276H321\" stroke=\"#c5c2bd\" opacity=\".75\"/>\n<rect x=\"249\" y=\"352\" width=\"74\" height=\"2\" rx=\"1\" fill=\"#f8f6f3\"/>\n<path d=\"M251 357H321\" stroke=\"#c9c6c0\" stroke-width=\".65\"/>\n<!-- service window -->\n<rect x=\"297\" y=\"289\" width=\"34\" height=\"17\" rx=\"1.2\" fill=\"#adaeaa\" stroke=\"#878a85\" stroke-width=\"1\"/>\n<rect x=\"301\" y=\"292\" width=\"26\" height=\"8\" rx=\"1\" fill=\"#202426\"/>\n<path d=\"M301 301H326\" stroke=\"#faf9f6\" stroke-width=\"1.5\"/>\n<!-- access cover -->\n<path d=\"M293 489V446Q293 432 307 432H339V489\" fill=\"#d8d6d1\" stroke=\"#9c9d99\" stroke-width=\"1.35\"/>\n<path d=\"M300 488V451Q300 438 312 438H337\" fill=\"none\" stroke=\"#f4f2ef\" stroke-width=\"1.3\"/>\n<rect x=\"308\" y=\"450\" width=\"26\" height=\"40\" rx=\"9\" fill=\"#dfddd8\" stroke=\"#7f8583\" stroke-width=\"1.4\"/>\n<path d=\"M310 462H332M310 474H332\" stroke=\"#777e7d\" stroke-width=\"1.1\"/>\n<circle cx=\"313\" cy=\"444\" r=\"3.1\" fill=\"#c3c3bf\" stroke=\"#91948f\"/>\n<circle cx=\"331\" cy=\"444\" r=\"3.1\" fill=\"#c3c3bf\" stroke=\"#91948f\"/>\n<circle class=\"status-light\" cx=\"329\" cy=\"79\" r=\"2.6\"/>\n<!-- panel screws -->\n<g fill=\"#777c7a\" stroke=\"#eee\" stroke-width=\".6\"><circle cx=\"28\" cy=\"20\" r=\"2.6\"/><circle cx=\"127\" cy=\"20\" r=\"2.6\"/><circle cx=\"231\" cy=\"20\" r=\"2.6\"/><circle cx=\"330\" cy=\"20\" r=\"2.6\"/><circle cx=\"28\" cy=\"485\" r=\"2.6\"/><circle cx=\"128\" cy=\"485\" r=\"2.6\"/><circle cx=\"230\" cy=\"485\" r=\"2.6\"/></g>\n</svg>";
  class HydraulicPlanCard extends HeatpumpFlowCard {
    static getConfigElement() { return document.createElement('hydraulic-plan-card-editor'); }
    static getStubConfig() {
      return {type:'custom:hydraulic-plan-card',preset:'none',plan:{components:[],connections:[]}};
    }
    setConfig(config) {
      if(!config||typeof config!=='object')throw Error('Invalid card configuration');
      this._integratedPlan=HPC_FREE.normalize(config.plan);
      this._integratedSig=null;
      // The original schematic is the primary and only display. Extra components
      // are merged into its original SVG, never a separate dashboard/card.
      const derived=HPC_INTEGRATED.coreConfig({...config,plan:this._integratedPlan});
      // The upstream Heatpump Flow Card rejects unknown unit_style values.
      // Validate against its supported Bosch style, but retain our own
      // WPLS selection in the normalized plan and render it separately.
      this._wplsSelected=derived.unit_style==='buderus_wpls_13_2';
      if(this._wplsSelected)derived.unit_style='bosch';
      super.setConfig(derived);
    }
    _startState() {
      if(this._integratedPlan?.components.length)return false;
      return super._startState();
    }
    // Render the heater mixing valve with the ORIGINAL card's own
    // _circuitSvg/_mixerSvg, including its correct integrated bypass.
    // Physical mixers must be visible even without a position sensor.
    _hasMixer(n) {
      const circuit=this._integratedPlan?.components
        .filter(c=>c.type==='heating_circuit')[n-1];
      if(circuit)return circuit.options?.mixed===true ||
        (circuit.options?.mixed!==false&&super._hasMixer(n));
      return super._hasMixer(n);
    }
    _unitKey() {
      if (this._sourceType === 'air' && this._wplsSelected) return 'buderus_wpls_13_2';
      return super._unitKey();
    }
    _unitArt() {
      if (this._unitKey() === 'buderus_wpls_13_2') return {below:HPC_WPLS_SVG,fans:[],above:'',snows:[]};
      return super._unitArt();
    }
    _cls(id,on) {
      super._cls(id,on);
      // Follow the original card's fanOn state instead of guessing from compressor power.
      if (id === 'fan' && this._unitKey() === 'buderus_wpls_13_2') {
        const unit=this._$('svg')?.querySelector('.buderus-wpls132');
        if (unit) unit.classList.toggle('running',!!on);
      }
    }
    _render() {
      if(!this._integratedPlan?.components.length&&this._hass&&this._config&&this._startState()){
        const lang=String(this._hass?.locale?.language||navigator.language||'de').startsWith('de')?'de':'en';
        const message=lang==='de'
          ? 'Noch keine Bauteile eingerichtet. Öffne den Karteneditor und ergänze Wärmeerzeuger, Speicher und Heizkreise.'
          : 'No components configured. Open the card editor to add heat sources, tanks and circuits.';
        this._renderRoot().innerHTML='<style>'+HeatpumpFlowCard.styles+'</style><ha-card class="start">'
          +'<div class="head"><div class="title">Hydraulic Plan Card</div></div><div class="hint" id="start-hint">'
          +this._esc(message)+'</div></ha-card>';
        this._rendered=true;return;
      }
      super._render();
      this._syncAdditional(true);
    }
    set hass(hass) {
      super.hass=hass;
      this._syncAdditional();
    }
    _syncNativeTemperatureLabels(svg,labels) {
      for(const id of labels){
        const label=svg.querySelector('#'+id);
        if(label)label.textContent='';
        if(id==='t-boiler-flow'){
          const boiler=svg.querySelector('#boiler');
          if(!boiler)continue;
          const values=String(boiler.dataset.a11y||'').split(', ');
          values.pop();
          if(values.length)boiler.dataset.a11y=values.join(', ');
          else boiler.removeAttribute('data-a11y');
        }
      }
    }
    _syncNativeCircuitFlow(svg,plan,nativePaths={}) {
      // Reuse the original component artwork, while all heating pipes and
      // mixer bypass geometry come from the central hydraulic router.
      const evidence=HPC_NETWORK.flowEvidence(plan,this._hass);
      const circuits=plan.components.filter(n=>n.type==='heating_circuit').slice(0,6);
      const allActive=[];
      for(const [index,circuit] of circuits.entries()){
        const suffix=index?String(index+1):'';
        const flow=plan.connections.filter(e=>e.to===circuit.id&&e.to_port==='flow_in');
        const ret=plan.connections.filter(e=>e.from===circuit.id&&e.from_port==='return_out');
        const active=flow.length>0&&ret.length>0&&
          flow.some(e=>evidence.get(e.id)?.active)&&
          ret.some(e=>evidence.get(e.id)?.active);
        allActive.push(active);
        // The original radiator and mixer paths remain in their SVG group,
        // but the external pipe geometry comes from HPC_NETWORK.mergeRoutes.
        const paths=nativePaths[circuit.id]||{};
        for(const [leg,part] of [['flow','vl'],['return','rl']]){
          const pipe=svg.querySelector('#p-hc-'+part+suffix);
          const flowPath=svg.querySelector('#f-hc-'+part+suffix);
          if(pipe){
            // Each native SVG path may contain two physically different
            // temperature regions (hot feed versus mixed downstream).
            // Paint the routed hydraulic segments separately and exactly
            // once; never color the entire circuit with a single fallback.
            const id='hpi-temp-'+circuit.id+'-'+leg;
            pipe.parentElement?.querySelector('[data-hpi-temp-group="'+id+'"]')?.remove();
            const colors=paths[leg]?.colored||[];
            if(colors.length){
              pipe.setAttribute('d','');
              const group=document.createElementNS('http://www.w3.org/2000/svg','g');
              group.dataset.hpiTempGroup=id;
              for(const segment of colors){
                const path=document.createElementNS('http://www.w3.org/2000/svg','path');
                path.setAttribute('class','pipe hpi-native-temperature');
                path.setAttribute('d',segment.pipe);
                path.style.setProperty('--pc',segment.color);
                group.appendChild(path);
              }
              pipe.parentElement?.insertBefore(group,pipe.nextSibling);
            }else pipe.setAttribute('d',paths[leg]?.pipe||'');
          }
          if(flowPath)flowPath.setAttribute('d',paths[leg]?.flow||'');
          if(flowPath)flowPath.classList.toggle('on',active&&!!paths[leg]?.flow);
        }
        const body=svg.querySelector('#f-hc-body'+suffix);
        if(body)body.classList.toggle('on',active);
        // The emitter's fixed legacy body starts where the network-routed
        // mixed flow ends (x=826). Use the *same* post-mixer temperature
        // instead of falling back to the original generator's hot colour.
        const emitter=svg.querySelector('#p-hc-body'+suffix);
        const feedColour=paths.flow?.colored?.at(-1)?.color;
        if(emitter&&feedColour){
          emitter.style.setProperty('--pc',feedColour);
          // Preserve the radiator's supply-to-return gradient where used.
          // Only the upper stop gets the mixed-temperature colour.
          const head=svg.querySelector('#g-hcb'+suffix+'-a');
          if(head){
            head.setAttribute('stop-color',feedColour);
            emitter.style.stroke='url(#g-hcb'+suffix+')';
          }else emitter.style.stroke=feedColour;
          const ribs=svg.querySelector('#g-rad'+suffix+'-a');
          if(ribs)ribs.setAttribute('stop-color',feedColour);
        }
        const mixer=svg.querySelector('#p-hc-mix'+suffix);
        if(mixer){
          mixer.setAttribute('d',paths.mixer?.pipe||'');
          mixer.classList.toggle('on',active);
        }
      }
      // Legacy risers and collector strips were independent fixed pipe
      // geometry. The graph routes now own those segments exactly once.
      for(const path of svg.querySelectorAll(
        'path[id^="p-hc-trunk"],path[id^="f-hc-trunk"],'+
        'path[id^="p-hc-up"],path[id^="f-hc-up"],'+
        'path[id^="p-hc-down"],path[id^="f-hc-down"]')){
        path.setAttribute('d','');
        path.classList.remove('on');
      }
    }
    _syncMixerIllustrations(svg,plan) {
      // A mixer position is a *visual* hot-water opening, not a measured flow rate.
      // Only verified pump/pipe flow permits moving dashes.
      const evidence=HPC_NETWORK.flowEvidence(plan,this._hass);
      const circuits=plan.components.filter(node=>node.type==='heating_circuit').slice(0,6);
      for(const [index,circuit] of circuits.entries()){
        const suffix=index?String(index+1):'';
        const group=svg.querySelector('#mixer'+suffix);
        if(!group)continue;
        const reading=HPC_FREE.state(this._hass,circuit.sensors?.mixer);
        const measured=reading&&Number.isFinite(reading.number)&&reading.number>=0&&reading.number<=100;
        const hot=measured?
          (circuit.options?.mixer_inverted?100-reading.number:reading.number)/100:null;
        const label=group.querySelector('#t-hc-mix'+suffix);
        if(label&&measured)label.textContent=Math.round(hot*100)+' %';
        if(label){
          label.setAttribute('x','782');
          label.setAttribute('y','399');
          label.setAttribute('text-anchor','start');
        }
        // Original three-port valve, with an opaque backplate so the
        // hot/cold supply pipes cannot draw THROUGH its triangular symbol.
        // Reuse the native SVG and move the complete group above the
        // temperature-coloured pipe overlays within its native circuit.
        const originalValve=group.querySelector('.mix-body');
        if(!group.querySelector('.hpi-mix-backplate')){
          const backdrop=document.createElementNS('http://www.w3.org/2000/svg','circle');
          backdrop.setAttribute('class','hpi-mix-backplate');
          backdrop.setAttribute('cx','760');
          backdrop.setAttribute('cy','360');
          backdrop.setAttribute('r','19');
          group.insertBefore(backdrop,group.firstChild);
        }
        group.parentElement?.appendChild(group);
        if(originalValve)originalValve.setAttribute('d',
          'M748 352 L760 360 L748 368 Z '+
          'M772 352 L760 360 L772 368 Z '+
          'M752 374 L760 360 L768 374 Z');
        group.querySelector('.hpi-mix-illustration')?.remove();
        const flows=plan.connections.filter(edge=>edge.to===circuit.id&&edge.to_port==='flow_in');
        const returns=plan.connections.filter(edge=>edge.from===circuit.id&&edge.from_port==='return_out');
        const active=flows.some(edge=>evidence.get(edge.id)?.active)&&
          returns.some(edge=>evidence.get(edge.id)?.active);
        // This path is routed by the network: never draw a second physical
        // pipe, just the flow particles within its existing return bypass.
        const bypass=svg.querySelector('#p-hc-mix'+suffix);
        if(!bypass)continue;
        let indicator=svg.querySelector('#hpi-mix-bypass-flow'+suffix);
        if(!indicator){
          bypass.insertAdjacentHTML('afterend',
            '<path id="hpi-mix-bypass-flow'+suffix+'" class="flow hpi-mix-bypass-flow" aria-hidden="true"/>');
          indicator=svg.querySelector('#hpi-mix-bypass-flow'+suffix);
        }
        indicator.setAttribute('d',measured&&active&&hot<1?bypass.getAttribute('d')||'':'');
        indicator.classList.toggle('on',!!measured&&active&&hot<1);
        indicator.style.opacity=measured?String(1-hot):'0';
      }
    }
    _syncAdditional(force=false) {
      const p=this._integratedPlan;
      if(!this._hass||!p?.components.length)return;
      const svg=this._$('svg');if(!svg)return;
      const model=HPC_INTEGRATED.layout(p,this._hcCount||1,
        this._config?.primary_pump===true);
      // The original hot-water tank remains in use for direct generator
      // charging. A coil loaded from the buffer is rendered in the consumer
      // column using the exact same tank pictogram, not twice.
      const nativeDhw=svg.querySelector('rect.tank[x="520"][y="40"]')?.closest('g.tap');
      if(nativeDhw){
        nativeDhw.style.display=p.components.some(n=>
          n.type==='dhw_tank'&&model.anchored.has(n.id))?'':'none';
      }
      // An explicit graph with no heating circuits must not inherit the
      // original demo's first radiator. Keep original heater art otherwise.
      if(!p.components.some(n=>n.type==='heating_circuit')){
        const unusedCircuit=svg.querySelector('#p-hc-vl')?.closest('g[transform]');
        if(unusedCircuit)unusedCircuit.style.display='none';
      }
      // The original heat-pump layout has a fixed illustrative 3-way valve.
      // In explicit graph mode it would be a duplicate (or an invented valve).
      // Use only the user's configured changeover component instead.
      const inheritedValve=svg.querySelector('#valve-arrow')?.closest('g.tap');
      if(inheritedValve)inheritedValve.style.display='none';
      const ids=new Set();
      for(const n of p.components){
        Object.values(n.sensors||{}).forEach(id=>{if(id)ids.add(id);});
        (n.level_sensors||[]).forEach(point=>{if(point.entity)ids.add(point.entity);});
      }
      for(const edge of p.connections){
        if(edge.flow_entity)ids.add(edge.flow_entity);
        if(edge.temperature_entity)ids.add(edge.temperature_entity);
      }
      const tick=[...ids].sort().map(id=>{
        const st=this._hass?.states?.[id];
        return id+':'+(st?.state??'unavailable')+':'+(st?.attributes?.unit_of_measurement??'');
      }).join('|');
      const signature=JSON.stringify(p)+'|'+tick;
      if(!force&&signature===this._integratedSig&&svg.querySelector('#hpi-root')){
        this._syncNativeTemperatureLabels(svg,this._integratedNativeTemperatureLabels||[]);
        this._syncMixerIllustrations(svg,p);
        return;
      }
      const rendered=HPC_INTEGRATED.svg(model,this._hass);
      // Preserve the original hydraulic anchors and labels. Oil and ETA use
      // their own recognizable boiler artwork in exactly the same SVG.
      const originalBoilerArt=svg.querySelector('#primary-boiler-art');
      const primarySource=p.components.find(HPC_INTEGRATED.isSource);
      const primaryType=primarySource?.type;
      if(originalBoilerArt)originalBoilerArt.style.display=
        ['wood_chip_boiler','oil_boiler','gas_boiler'].includes(primaryType)||
        (primaryType==='wood_gasifier'&&primarySource.options?.froeling_view!=='classic')
          ?'none':'';
      // Only the Fröling S3 cutaway is frameless; other generators retain
      // their native cabinet and status text.
      const framelessFroeling=primaryType==='wood_gasifier'&&
        primarySource?.options?.froeling_view!=='classic';
      const sourceBox=svg.querySelector('#hp-box');
      if(sourceBox)sourceBox.style.display=framelessFroeling?'none':'';
      if(primarySource){
        const sourceGroup=sourceBox?.closest('g.tap');
        for(const selector of ['text.unit-title','.vapour',
          '#t-hp-status','#t-hp-power','#t-hp-cop','#t-hp-heat']){
          const el=sourceGroup?.querySelector(selector);
          if(el)el.style.display=framelessFroeling?'none':'';
        }
        if(primaryType!=='heat_pump'){
          const oldMiniBoiler=svg.querySelector('#boiler');
          if(oldMiniBoiler)oldMiniBoiler.style.display='none';
        }
      }
      // A storage-only plan is valid. Without a selected heat source the
      // original engine would otherwise paint a fictitious heat pump/boiler.
      if(!p.components.some(c=>HPC_INTEGRATED.isSource?.(c)||
        ["wood_gasifier","oil_boiler","pellet_boiler","wood_chip_boiler","gas_boiler","heat_pump"].includes(c.type))){
        const source=svg.querySelector("#hp-box")?.closest("g.tap");
        if(source)source.style.display="none";
      }
      // Reuse the original heating-circuit artwork. Shared trunks and mixer
      // bypasses are routed by HPC_NETWORK and reuse the native SVG paths.
      for(const legacy of svg.querySelectorAll('path[id^="p-"],path[id^="f-"]')){
        if(legacy.closest('#hpi-root'))continue;
        const id=legacy.id;
        legacy.style.display=/^[pf]-hc(?:-?vl|-?rl|-?body|-?trunk|-?up|-?down|-?mix)/.test(id)
          ?'':'none';
      }
      svg.querySelector('#hpi-root')?.remove();
      svg.insertAdjacentHTML('beforeend','<g id="hpi-root"><defs>'+rendered.defs+'</defs>'+rendered.body+'</g>');
      this._integratedNativeTemperatureLabels=rendered.nativeTemperatureLabels||[];
      this._syncNativeTemperatureLabels(svg,this._integratedNativeTemperatureLabels);
      // First tank remains the upstream tank graphic. Only its fill gains the
      // additional measured stratification points configured for that tank.
      const firstBuffer=rendered.firstBuffer;
      const firstDhw=rendered.firstDhw;
      if(firstBuffer){
        const tank=svg.querySelector('rect.tank[x="520"][y="320"]');
        if(tank){
          tank.setAttribute('fill','url(#hpi-'+firstBuffer+')');
          tank.setAttribute('rx','23');
          tank.setAttribute('stroke','var(--divider-color,#737b82)');
          tank.setAttribute('stroke-width','1.25');
        }
        const title=svg.querySelector('text.tank-title[x="580"][y="310"]');
        if(title)title.textContent=p.components.find(c=>c.id===firstBuffer)?.name||title.textContent;
      }
      this._syncNativeCircuitFlow(svg,p,rendered.nativePipes);
      this._syncMixerIllustrations(svg,p);
      if(firstDhw){
        svg.querySelector('rect.tank[x="520"][y="40"]')?.setAttribute('fill','url(#hpi-'+firstDhw+')');
        const title=svg.querySelector('text.tank-title[x="580"][y="30"]');
        if(title)title.textContent=p.components.find(c=>c.id===firstDhw)?.name||title.textContent;
      }
      const height=Math.max(model.height,560+(this._hcCount-1)*250);
      svg.setAttribute('viewBox','0 0 '+model.width+' '+height);
      // Keep the ORIGINAL 1000-unit schematic scaled to the card width.
      // Extra components extend the scrollable canvas without zooming in the
      // existing equipment when the editor preview is only ~500px wide.
      // Percentages also adapt automatically when HA resizes the editor/card.
      svg.style.width=(model.width/10)+'%';
      // Fullscreen on phones must not shrink to an unreadable overview.
      // Preserve a minimum drawing scale there; the stage is scrollable in
      // both directions, while the normal editor preview remains responsive.
      svg.style.minWidth=this._fullscreenOpen?(model.width*.85)+'px':'';
      svg.style.maxWidth='none';
      const root=this._renderRoot();
      // This SVG can be much wider than the dashboard. The stage owns horizontal
      // scrolling, but vertical wheel/touch scrolling must continue to the
      // fullscreen card (or to the page outside fullscreen). A blanket
      // overscroll-behavior: contain trapped wheel events over the stage.
      const stage=root.querySelector('.stage');
      const card=root.querySelector('ha-card');
      card?.classList.add('hpi-expanded');
      if(stage){
        stage.style.overflowX='auto';
        stage.style.overscrollBehaviorX='contain';
        stage.style.overscrollBehaviorY='auto';
        stage.style.touchAction='pan-x pan-y';
        stage.tabIndex=0;
        stage.setAttribute('role','region');
        stage.setAttribute('aria-label',String(this._hass?.locale?.language||'de').startsWith('de')
          ? 'Hydraulikschema – horizontal verschiebbar' : 'Hydraulic diagram – scroll horizontally');
        if(!stage.dataset.hpiWheelBound){
          // Shift + mouse-wheel is a useful fallback for wide diagrams on
          // desktop computers without a horizontal trackpad gesture.
          stage.addEventListener('wheel',(event)=>{
            if(!event.shiftKey||!event.deltaY||event.deltaX)return;
            const previous=stage.scrollLeft;
            stage.scrollLeft+=event.deltaY;
            if(previous!==stage.scrollLeft)event.preventDefault();
          },{passive:false});
          stage.dataset.hpiWheelBound='1';
        }
      }
      if(!root.querySelector('#hpi-styles')){
        const style=document.createElement('style');
        style.id='hpi-styles';
        style.textContent=
          '.hpi-expanded{--hfc-hot:#eb2637;--hfc-heat:#b956bd;--hfc-cold:#258fdf;--hfc-flow-cold:#b956bd;--hfc-flow-hot:#eb2637;--hfc-return-cold:#258fdf;--hfc-return-hot:#8d53d6;--hfc-tank-warm:#8d53d6;--hfc-tank-hot:#eb2637;}'
          +'.hpi-expanded .stage{overflow-x:auto;overscroll-behavior-x:contain;overscroll-behavior-y:auto;scrollbar-width:thin;}'
          +'.hpi-expanded.fullscreen{overflow-y:auto;overflow-x:hidden;overscroll-behavior-y:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;}'
          +'.hpi-expanded .stage #svg{display:block;max-width:none;height:auto;}'
          +'.hpi-expanded .stage:focus-visible{outline:2px solid var(--primary-color,#03a9f4);outline-offset:-2px;}'
          +'.hpi-component .tap{cursor:pointer}.hpi-component .tank-title{font-size:16px}'
          +'.hpi-component .small{font-size:13px}'
          +'.hpi-component .heater{fill:none;stroke:var(--hfc-heat,#c8783d);stroke-width:5;stroke-linecap:round}'
          +'.hpi-component .rib{fill:none;stroke:var(--hfc-muted,#94a3b8);stroke-width:8;stroke-linecap:round}'
          +'.hpi-oil-casing{fill:var(--secondary-background-color,#3c5364);stroke:var(--divider-color,#667987);stroke-width:1.7;}'
          +'.hpi-oil-side{fill:var(--secondary-background-color,#314251);stroke:var(--divider-color,#718394);stroke-width:1.5;stroke-linejoin:round;}'
          +'.hpi-oil-top{fill:var(--hfc-muted,#8193a3);stroke:var(--divider-color,#728492);stroke-width:1.2;stroke-linejoin:round;}'
          +'.hpi-oil-plinth{fill:var(--secondary-text-color,#52616e);}'
          +'.hpi-oil-door{fill:var(--card-background-color,#26333d);stroke:var(--hfc-muted,#81909a);stroke-width:1.9;}'
          +'.hpi-oil-hinge,.hpi-oil-bolt{fill:var(--hfc-muted,#a8b3ba);}'
          +'.hpi-oil-flange{fill:var(--secondary-background-color,#65717a);stroke:var(--hfc-muted,#a4afb7);stroke-width:1.8;}'
          +'.hpi-oil-flange-inner{fill:var(--card-background-color,#2c3640);stroke:var(--divider-color,#909ca6);stroke-width:1.5;}'
          +'.hpi-oil-mark{fill:var(--hfc-cold,#81b9d9);stroke:none;}'
          +'.hpi-source-case{fill:var(--secondary-background-color,#29303a);stroke:var(--divider-color,#66717b);stroke-width:2.5;}'
          +'.hpi-source-door{fill:var(--card-background-color,#202124);stroke:var(--divider-color,#66717b);stroke-width:1.7;}'
          +'.hpi-source-seam{fill:none;stroke:var(--hfc-muted,#77838b);stroke-width:2;stroke-linecap:round;}'
          +'.hpi-source-handle{fill:var(--hfc-muted,#89939b);stroke:none;}'
          +'.hpi-source-panel{fill:var(--card-background-color,#202124);stroke:var(--divider-color,#66717b);stroke-width:1.7;}'
          +'.hpi-source-display{fill:#405765;stroke:#8197a0;stroke-width:1;}'
          +'.hpi-source-led{fill:var(--disabled-text-color,#737373);}'
          +'.hpi-source-led.on{fill:var(--hfc-good,#29a85e);}'
          +'.hpi-source-flame{fill:var(--disabled-text-color,#7b7b7b);transition:fill .25s;}'
          +'.hpi-source-flame.on{fill:var(--hfc-hot,#ff7043);filter:url(#glow);}'
          +'.hpi-source-hopper{fill:var(--secondary-background-color,#3b434d);stroke:var(--divider-color,#66717b);stroke-width:2;}'
          +'.hpi-source-pellet{fill:var(--hfc-heat,#b87952);stroke:none;}'
          +'.hpi-source-fan-ring{fill:none;stroke:var(--hfc-muted,#77838b);stroke-width:3;}'
          +'.hpi-source-fan-hub{fill:var(--hfc-muted,#77838b);stroke:none;}'
          +'.hpi-source-blades{fill:none;stroke:var(--hfc-muted,#77838b);stroke-width:4;stroke-linecap:round;}'
          +'.hpi-chip-body{fill:var(--secondary-background-color,#343943);stroke:var(--divider-color,#67717d);stroke-width:2.2;}'
          +'.hpi-chip-face{fill:#e9ad21;stroke:#ae8014;stroke-width:1.6;}'
          +'.hpi-chip-plinth{fill:var(--card-background-color,#1f242d);stroke:var(--divider-color,#66717b);stroke-width:1;}'
          +'.hpi-chip-feed{fill:var(--secondary-background-color,#515b66);stroke:var(--hfc-muted,#81909c);stroke-width:2;stroke-linejoin:round;}'
          +'.hpi-chip-screw{fill:none;stroke:var(--hfc-muted,#84939c);stroke-width:2.6;stroke-linecap:round;}'
          +'.hpi-chip-motor{fill:var(--card-background-color,#202124);stroke:var(--divider-color,#7a8793);stroke-width:2;}'
          +'.hpi-chip-screen{fill:#344e58;stroke:var(--hfc-muted,#95a0a8);stroke-width:1.3;}'
          +'.hpi-chip-divider{stroke:#9b7419;stroke-width:1.2;fill:none;}'
          +'.hpi-chip-brand{font-size:19px;font-weight:800;letter-spacing:1px;fill:#222933;}'
          +'.hpi-chip-model{font-size:14px;font-weight:700;fill:#26313b;}'
          +'.hpi-chip-model.is-compact{font-size:11px;}'
          +'.hpi-chip-light{fill:#6b7480;}'
          +'.hpi-chip-art.on .hpi-chip-light{fill:var(--hfc-good,#25b45e);}'
          +'.hpi-chip-side{fill:#949a9e;stroke:#626b74;stroke-width:1.4;}'
          +'.hpi-chip-window{fill:#2b3138;stroke:#5c656d;stroke-width:1.4;}'
          +'.hpi-chip-window-rim{fill:#404750;stroke:#7e8891;stroke-width:1.1;}'
          +'.hpi-chip-motor-ring{fill:none;stroke:#9a9fa5;stroke-width:2;}'
          +'.hpi-chip-motor-grille{fill:none;stroke:#b5babf;stroke-width:1.7;}'
          +'.hpi-chip-auger{fill:#3b4047;stroke:#929aa3;stroke-width:2;}'
          +'.hpi-particle-duct{fill:#4b4e53;stroke:#a9aeb5;stroke-width:2.5;}'
          +'.hpi-particle-chamber{fill:#2b2c30;stroke:#bfc3c8;stroke-width:3;}'
          +'.hpi-particle-inner{fill:none;stroke:#5d636a;stroke-width:2;}'
          +'.hpi-particle-electrodes{stroke:#ced2d7;stroke-width:3;stroke-linecap:round;}'
          +'.hpi-particle-ash{fill:#656565;stroke:#858585;stroke-width:1;}'
          +'.hpi-particle-arrow{fill:none;stroke:#d7d9dd;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;}'
          +'.hpi-particle-badge{fill:#232529;stroke:#bfc1c5;stroke-width:4;}'
          +'.hpi-particle-bolt{fill:#efb729;stroke:#e6bd42;stroke-width:1;}'
          +'.hpi-particle-art.on .hpi-particle-bolt{fill:#ffda2c;filter:url(#glow);}'
          +'.hpi-particle-reading{font-size:15px;font-weight:600;}'
          +'.hpi-silo-feed{fill:none;stroke:var(--hfc-muted,#9ca4ac);stroke-width:5;stroke-linecap:round;}'
          +'.hpi-silo-body,.hpi-silo-roof,.hpi-silo-hopper{fill:var(--secondary-background-color,#525963);stroke:var(--divider-color,#9da5ad);stroke-width:2;}'
          +'.hpi-silo-grain{fill:none;stroke:var(--hfc-heat,#ba995f);stroke-width:2;}'
          +'.hpi-silo-label,.hpi-silo-value,.hpi-flue-reading,.hpi-flue-status,.hpi-flue-values,.hpi-pipe-reading{fill:var(--primary-text-color,#eee);font-family:var(--ha-font-family-body,system-ui,sans-serif);paint-order:stroke;stroke:var(--card-background-color,#222);stroke-width:3;}'
          +'.hpi-silo-label,.hpi-flue-reading,.hpi-pipe-reading{font-size:13px;font-weight:600;}'
          +'.hpi-silo-value,.hpi-flue-status,.hpi-flue-values{font-size:11px;}'
          +'.hpi-flue-duct{fill:none;stroke:var(--divider-color,#858b93);stroke-width:10;stroke-linecap:round;stroke-linejoin:round;}'
          +'.hpi-buffer-port{fill:var(--card-background-color,#222);stroke-width:3;pointer-events:none;}'
          // Show the hydraulic temperature colour even if flow is not
          // confirmed. Only the animated white dash denotes circulation.
          +'.hpi-link .pipe{stroke:var(--pc,var(--hfc-muted));}'
          +'.hpi-link .pipe.on{stroke:var(--pc,var(--hfc-muted));}'
          +'.hpi-native-temperature{stroke:var(--pc,var(--hfc-muted))!important;}'
          +'.hpi-buffer-hot{stroke:var(--hfc-hot,#f37b4e);}'
          +'.hpi-buffer-cold{stroke:var(--hfc-cold,#448cdd);}'
          +'.hpi-riser-bridge{pointer-events:none;}'

          +'.hpi-froeling .hpi-fr-flame{transform-box:fill-box;transform-origin:center top;animation:hpi-fr-burn .8s ease-in-out infinite alternate;}'
          +'.hpi-froeling:not(.burning) .hpi-fr-flame,.hpi-froeling:not(.burning) .hpi-fr-embers{display:none;}'
          +'.hpi-froeling .hpi-fr-fanwheel,.hpi-froeling .hpi-fr-pumpwheel{transform-box:fill-box;transform-origin:center;animation:hpi-fr-spin 1.2s linear infinite;}'
          +'.hpi-froeling:not(.fan-on) .hpi-fr-fanwheel,.hpi-froeling:not(.pump-on) .hpi-fr-pumpwheel{animation-play-state:paused;}'
          +'.hpi-froeling .hpi-fr-waterflow{fill:none;stroke:#f3f6ff;stroke-width:3;stroke-dasharray:5 16;stroke-linecap:round;animation:hpc-rla-motion 1.4s linear infinite;}'
          +'.hpi-froeling .hpi-fr-smoke{animation:hpi-fr-smoke 1.4s linear infinite;}'
          +'.hpi-froeling:not(.fan-on) .hpi-fr-smoke{animation-play-state:paused;opacity:.15;}'
          +'@keyframes hpi-fr-spin{to{transform:rotate(360deg)}}'
          +'@keyframes hpi-fr-burn{from{transform:scaleX(.87) scaleY(.89);opacity:.8}to{transform:scaleX(1.06) scaleY(1.06);opacity:1}}'
          +'@keyframes hpi-fr-smoke{to{stroke-dashoffset:-34}}'
          +'@media (prefers-reduced-motion:reduce){.hpi-froeling .hpi-fr-flame,.hpi-froeling .hpi-fr-smoke,.hpi-froeling .hpi-fr-fanwheel,.hpi-froeling .hpi-fr-pumpwheel,.hpi-froeling .hpi-fr-waterflow{animation:none!important}}'
          +'.hpi-oil-seam{fill:none;stroke:var(--divider-color,#596c7c);stroke-width:1.25;stroke-linecap:round;}'
          +'.hpi-oil-burner{fill:var(--secondary-background-color,#4d5966);stroke:var(--hfc-muted,#8795a0);stroke-width:1.7;}'
          +'.hpi-oil-burner-neck{fill:var(--secondary-background-color,#7b858d);stroke:var(--divider-color,#a6b0b9);stroke-width:1.3;}'
          +'.hpi-oil-motor{fill:var(--secondary-text-color,#718293);stroke:var(--divider-color,#a2adb7);stroke-width:1;}'
          +'.hpi-oil-fan{fill:var(--card-background-color,#303943);stroke:var(--hfc-muted,#aab6c0);stroke-width:1.7;}'
          +'.hpi-oil-fan-hub{fill:var(--hfc-muted,#9cabb5);}'
          +'.hpi-oil-fan-blades{fill:none;stroke:var(--hfc-muted,#9daab4);stroke-width:2;stroke-linecap:round;}'
          +'.hpi-oil-hose{fill:none;stroke:var(--secondary-text-color,#b9a885);stroke-width:2.1;stroke-linecap:round;}'
          +'.hpi-oil-control{fill:var(--secondary-background-color,#35434e);stroke:var(--divider-color,#8a99a7);stroke-width:1;}'
          +'.hpi-oil-display{fill:#284e62;stroke:#87a9b9;stroke-width:.9;}'
          +'.hpi-oil-display-line{fill:none;stroke:#8abed3;stroke-width:1.1;stroke-linecap:round;}'
          +'.hpi-oil-led{fill:var(--disabled-text-color,#6c7680);transition:fill .2s;}'
          +'.hpi-oil-art.on .hpi-oil-led{fill:var(--hfc-good,#36bd77);filter:url(#glow);}'
          +'.hpi-oil-status{fill:var(--secondary-text-color,#919ba6);}'
          +'.hpi-oil.on .hpi-oil-status{fill:var(--hfc-good,#36bd77);}'
          +'.hpi-oil-kind{font-size:11px;font-weight:600;fill:var(--secondary-text-color,#919ba6);}'
          +'.hpi-oil-reading{fill:var(--hfc-muted,var(--secondary-text-color));}'
          +'.hpi-source-unit .unit-title,.hpi-primary-source-title{font-size:17px;font-weight:700;paint-order:stroke;stroke:var(--card-background-color,#202124);stroke-width:3;}'
          +'.hpi-mix-backplate{fill:var(--card-background-color,#202124);stroke:var(--hfc-muted,#9ca3af);stroke-width:1.5;pointer-events:none;}'
          +'.mixer .mix-body{fill:var(--card-background-color,#202124);stroke:var(--primary-text-color,#e5e7eb);stroke-width:2.3;stroke-linejoin:round;pointer-events:none;}'
          +'.hpi-mix-bypass-flow{opacity:.7;}'
          +'@media(prefers-reduced-motion:reduce){.hpi-mix-bypass-flow{animation:none!important;}}'
          +'.hpi-rla-bypass{fill:none;stroke:var(--pc,#8d53d6);stroke-width:5;stroke-linecap:round;stroke-linejoin:round;}'
          +'.hpi-rla-flow{fill:none;stroke:#fff;stroke-width:2;stroke-dasharray:4 10;animation:hpc-rla-motion 1.4s linear infinite;pointer-events:none;}'
          +'@keyframes hpc-rla-motion{to{stroke-dashoffset:-28}}'
          +'@media (prefers-reduced-motion:reduce){.hpi-rla-flow{animation:none;}}'
          +'.hpi-rla-pump{fill:var(--card-background-color,#202124);stroke:var(--hfc-return,#4c9ed9);stroke-width:2.5;}'
          +'.hpi-rla-pump-symbol{fill:none;stroke:var(--primary-text-color,#d5dce8);stroke-width:1.8;stroke-linejoin:round;}'
          +'.hpi-rla-pump-symbol.on{fill:var(--hfc-return,#4c9ed9);}'
          +'.hpi-rla-valve{fill:var(--card-background-color,#202124);stroke:var(--hfc-heat,#e7853d);stroke-width:3;}'
          +'.hpi-rla-symbol{fill:none;stroke:var(--hfc-muted,#9ca3af);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;}'
          +'.hpi-rla-label{font-size:12px;font-weight:700;fill:var(--primary-text-color);}';
        root.append(style);
      }
      this._integratedSig=signature;
    }
  }
  const HPC_WPLS_UNIT_STYLES = [...HFC_UNIT_STYLES, 'buderus_wpls_13_2'];
  class HydraulicPlanCardEditor extends HeatpumpFlowCardEditor {
    _editorState(config=this._config){
      try{
        return this._editorStateUnsafe(config);
      }catch(error){
        console.error('hydraulic-plan-card editor state:',error);
        return Array.isArray(config?.plan?.components)&&config.plan.components.length?'existing':'new';
      }
    }
    _editorStateUnsafe(config){
      const current=config||{};
      if(current.editor_mode==="classic")return "classic";
      const hasClassicConfig=Object.values(current.entities||{}).some(Boolean)||
        ["preset","generator_type","boiler_type","boiler_name","hc_count","buffer"]
          .some(key=>Object.hasOwn(current,key)&&
            !(key==="preset"&&current[key]==="none"));
      if(Array.isArray(current.plan?.components)){
        if(HPC_MIGRATION.check(current.plan).length||
          Number(current.hpc_schema_version)>HPC_MIGRATION.VERSION)return "incomplete";
        if(current.plan.components.length||
          Number(current.hpc_schema_version)>=HPC_MIGRATION.VERSION||
          current.hpc_legacy_imported===true||current.hpc_migration_backup)return "existing";
        if(hasClassicConfig)return "classic";
        return "new";
      }
      return hasClassicConfig?"classic":"new";
    }
    setConfig(config){
      // A throwing editor setConfig makes Home Assistant disable the visual editor.
      // Keep the incoming configuration untouched and show the error instead.
      try{
        this._setConfigUnsafe(config);
      }catch(error){
        this._config=config&&typeof config==='object'?config:{};
        this._showRenderError(error);
      }
    }
    _setConfigUnsafe(config){
      // Home Assistant can call setConfig repeatedly (including for our own config-changed
      // event). Redrawing on an equivalent config destroys focused text inputs and selects.
      const incoming=config||{};
      const emptyPlan=Array.isArray(incoming.plan?.components)&&
        incoming.plan.components.length===0&&!(incoming.plan.connections||[]).length;
      const classic=this._editorState(incoming)==='classic'&&
        (!Array.isArray(incoming.plan?.components)||emptyPlan);
      let result;
      try{
        result=HPC_MIGRATION.upgrade(incoming,{classic});
      }catch(error){
        this._config=incoming;
        this._showRenderError(error);
        return;
      }
      const newConfig=result.changed?result.config:incoming;
      this._migrationWarnings=result.warnings||[];
      const changed=JSON.stringify(this._config)!==JSON.stringify(newConfig);
      this._config=newConfig;
      // Versioned, non-destructive plan upgrades are committed once.
      // Calling setConfig again with the migrated config is idempotent.
      if(result.changed){
        this.dispatchEvent(new CustomEvent('config-changed',{
          detail:{config:newConfig},bubbles:true,composed:true
        }));
      }
      if(changed || !this._freeUi?.isConnected)this._renderFlex();
    }
    set hass(hass){
      const first=!this._hass;
      this._hass=hass&&typeof hass==='object'?hass:{states:{},entities:{},devices:{}};
      // Live HA data changes frequently. Never replace the whole configuration form;
      // this would interrupt typing, select popovers and drag operations.
      const discoveryErrors=[];
      const detect=(label,fn)=>{
        try{
          const candidates=fn(this._hass);
          return Array.isArray(candidates)?candidates:[];
        }
        catch(error){
          console.warn('hydraulic-plan-card editor discovery:',label,error);
          discoveryErrors.push(label);
          return [];
        }
      };
      const signatureOf=candidates=>candidates.map(candidate=>[
        candidate?.id,candidate?.type,candidate?.model,candidate?.count,
        Object.values(candidate?.entities||{})
      ]);
      const candidateSignature=JSON.stringify({
        ems:signatureOf(detect('EMS-ESP',HPC_EMS.detect)),
        emsCircuits:signatureOf(detect('EMS-ESP circuits',HPC_EMS.detectCircuits)),
        emsDhw:signatureOf(detect('EMS-ESP hot water',HPC_EMS.detectDhw)),
        eta:signatureOf(detect('ETA',HPC_ETA.detect)),
        etaParts:signatureOf(detect('ETA system components',HPC_ETA_SYSTEM.detect)),
        discoveryErrors
      });
      this._discoveryWarnings=discoveryErrors.length
        ?[...new Set(discoveryErrors)].map(label=>
          'Automatische Erkennung für '+label+' ist derzeit nicht verfügbar.')
        :[];
      if(first||!this._freeUi?.isConnected||candidateSignature!==this._emsSignature){
        this._emsSignature=candidateSignature;
        this._renderFlex();
      }
    }
    _render(){
      this._renderFlex();
    }
    _save(config,{repaint=true}={}){
      this._config=config;
      this.dispatchEvent(new CustomEvent("config-changed",{detail:{config},bubbles:true,composed:true}));
      // A changed sensor value must not destroy the expanded native ha-form.
      // Repaint only for changes that affect which controls exist.
      if(repaint)this._render();
    }
    _applyPlan(plan,extra={},options={}){
      const current=this._config||{};
      const normalized=HPC_FREE.normalize(plan);
      const previouslySaved=current.plan;
      // Do not let an editor action silently erase a component or connection
      // whose type/port comes from a newer extension or an older schema.
      const hasLostEntries=source=>source&&(
        Array.isArray(source.components)&&HPC_FREE.normalize(source).components.length!==source.components.length||
        Array.isArray(source.connections)&&HPC_FREE.normalize(source).connections.length!==source.connections.length);
      if(hasLostEntries(previouslySaved)||hasLostEntries(plan)){
        this._migrationWarnings=[
          'Nicht unterstützte Bauteile oder Leitungen erkannt. Die bestehende Konfiguration bleibt unverändert.'
        ];
        this._renderFlex();
        return;
      }
      // Always record the schema version for a saved graph. The migration
      // snapshot is kept unchanged, so rollback remains possible.
      this._save({...current,...extra,plan:normalized,
        hpc_schema_version:HPC_MIGRATION.VERSION},options);
    }
    _legacyPlan(){
      return HPC_MIGRATION.legacyPlan(this._config).plan;
    }
    _renderFlex(){
      try{
        this._renderFlexContent();
      }catch(error){
        this._showRenderError(error);
      }
    }
    _showRenderError(error){
      console.error('hydraulic-plan-card editor:',error);
      const target=this._freeUi||document.createElement('div');
      if(target.parentNode!==this){
        this._freeUi=target;
        this.append(target);
      }
      const message=error instanceof Error?error.message:String(error);
      target.innerHTML=`<style>${HPC_FREE.css}</style><div class="hpc-editor">
        <section class="hpc-connection-warning" role="alert">
          <strong>Der Konfigurationseditor konnte nicht vollständig geladen werden.</strong>
          <p>${HPC_FREE.esc(message)}</p>
          <p>Die gespeicherte Konfiguration wurde nicht geändert.</p>
          <button type="button" data-action="retry-render">Erneut laden</button>
        </section></div>`;
      target.querySelector('[data-action="retry-render"]')?.addEventListener('click',()=>this._renderFlex());
    }
    _renderFlexContent(){
      if(!this._config)return;
      if(this._form){this._form.remove();this._form=null;}
      this._assistant?.remove();this._assistant=null;
      this._warn?.remove();this._warn=null;
      this._switch?.remove();this._switch=null;
      const lang=String(this._hass?.locale?.language||navigator.language||"de").startsWith("de")?"de":"en";
      const t=(de,en)=>lang==="de"?de:en,esc=HPC_FREE.esc;
      const p=HPC_FREE.normalize(this._config.plan);
      const configured=this._editorState()!=="new";
      const discoveryWarnings=[];
      const detect=(label,fn)=>{
        try{
          const candidates=fn(this._hass);
          return Array.isArray(candidates)?candidates:[];
        }
        catch(error){
          console.warn('hydraulic-plan-card editor discovery:',label,error);
          discoveryWarnings.push('Automatische Erkennung für '+label+' ist derzeit nicht verfügbar.');
          return [];
        }
      };
      const emsCandidates=detect('EMS-ESP',HPC_EMS.detect);
      const emsCircuitCandidates=detect('EMS-ESP circuits',HPC_EMS.detectCircuits);
      const emsDhwCandidates=detect('EMS-ESP hot water',HPC_EMS.detectDhw);
      this._discoveryWarnings=[...new Set(discoveryWarnings)];
      const migrationNotes=[...(this._config.hpc_migration_notes||[]),
        ...(this._migrationWarnings||[]),...this._discoveryWarnings];
      const pendingEmsDhw=emsDhwCandidates.filter(candidate=>{
        const ids=new Set(Object.values(candidate.entities));
        const current=p.components.find(node=>node.type==='dhw_tank'&&(
          node.discovery?.provider==='ems-esp'&&node.discovery.id===candidate.id||
          Object.values(node.sensors||{}).some(id=>ids.has(id))));
        // There is usually only one EMS-ESP-controlled DHW tank. Never
        // create a duplicate beside an existing, manually configured tank.
        if(current)return Object.entries(candidate.entities).some(([key,id])=>id&&!current.sensors?.[key]);
        return !p.components.some(n=>n.type==='dhw_tank') &&
          Object.keys(candidate.entities).length>0;
      });
      const matchedEmsCircuit=(c,plan=p)=>{
        const ids=new Set(Object.values(c.entities));
        return plan.components.find(node=>node.type==='heating_circuit'&&(
          node.discovery?.provider==='ems-esp'&&node.discovery.id===c.id||
          Object.values(node.sensors||{}).some(id=>ids.has(id))||
          /^(?:heizkreis|hk)\s*[1-6]$/i.test(node.name||'')&&
          Number((node.name||'').match(/[1-6]$/)?.[0])===c.number));
      };
      const pendingEmsCircuits=emsCircuitCandidates.filter(c=>{
        const node=matchedEmsCircuit(c);
        return !node||Object.entries(c.entities).some(([key,id])=>id&&!node.sensors?.[key]);
      });
      const etaCandidates=detect('ETA',HPC_ETA.detect);
      const etaParts=detect('ETA system components',HPC_ETA_SYSTEM.detect);
      const chosenEtaPart=etaParts.find(c=>!p.components.some(n=>
        n.discovery?.provider==='eta-system'&&n.discovery.id===c.id ||
        Object.values(n.sensors||{}).some(id=>Object.values(c.entities).includes(id))));
      // An imported or manually configured boiler must not keep appearing as
      // "new". A second, genuinely different device is offered next.
      const chosenEms=emsCandidates.find(c=>!HPC_DISCOVERY.matchedNode(p,c,'ems-esp',emsCandidates));
      const chosenEta=etaCandidates.find(c=>!HPC_DISCOVERY.matchedNode(p,c,'eta',etaCandidates));
      const emsTypeLabel=(type)=>type==="oil_boiler"?t("Ölkessel","Oil boiler"):
        type==="gas_boiler"?t("Gaskessel","Gas boiler"):
        type==="heat_pump"?t("Wärmepumpe","Heat pump"):t("Heizgerät (Typ prüfen)","Heating device (verify type)");
      const emsInfo=chosenEms?`<section class="hpc-ems">
        <h3>${t("Heizung über EMS-ESP erkannt","Heating device detected via EMS-ESP")}</h3>
        <p class="hpc-row">${HPC_FREE.icon(chosenEms.type==="unknown"?"manifold":chosenEms.type)}<strong>${esc(chosenEms.name)}</strong> · ${esc(chosenEms.source)}</p>
        <label class="hpc-field">${t("Wärmeerzeuger auswählen","Select heating appliance")}
          <select id="hpc-ems-type">
            <option value="" ${chosenEms.type==="unknown"?"selected":""}>${t("Bitte Wärmeerzeuger wählen","Select appliance type")}</option>
            ${[["oil_boiler",t("Ölkessel","Oil boiler")],["gas_boiler",t("Gaskessel","Gas boiler")],
              ["pellet_boiler",t("Pelletkessel","Pellet boiler")],["wood_gasifier",t("Holzvergaser","Wood gasifier")],
              ["heat_pump",t("Wärmepumpe","Heat pump")]]
              .map(([id,name])=>`<option value="${id}" ${chosenEms.type===id?"selected":""}>${name}</option>`).join("")}
          </select></label>
        <p>${chosenEms.count} ${t("mögliche Messwerte gefunden. Je nach Geräteart werden nur passende Werte übernommen.","possible values found. Only values suitable for the chosen appliance will be assigned.")}</p>
        ${chosenEms.count===0?`<p>${t("Das Gerät ist erkannt, stellt aber noch keine passenden Messwerte bereit. Bitte die EMS-ESP-Veröffentlichung prüfen.","Device recognized, but no matching measured values are available yet. Check EMS-ESP publishing settings.")}</p>`:""}
        ${chosenEms.type==="unknown"?`<p>${t("Die Geräteart ist nicht eindeutig erkennbar. Bitte den Wärmeerzeuger selbst auswählen. Eine Modellliste ist kein Nachweis des installierten Geräts.","The appliance type is unclear. Select it yourself; a list of supported models does not identify the installed device.")}</p>`:""}
        <button type="button" data-action="ems-apply" ${chosenEms.type==="unknown"?"disabled":""}>${chosenEms.count?t("Wärmeerzeuger übernehmen und Werte zuordnen","Add appliance and assign values"):t("Wärmeerzeuger hinzufügen","Add detected appliance")}</button>
      </section>`:"";
      const emsCircuitInfo=pendingEmsCircuits.length?`<section class="hpc-ems">
        <h3>${t("EMS-ESP-Heizkreise erkannt","EMS-ESP heating circuits found")}</h3>
        <p>${pendingEmsCircuits.map(c=>esc(c.name)+" ("+c.count+" "+t("Messwerte","values")+")").join(" · ")}</p>
        <p>${t("Erkannte Sensoren werden ergänzt. Eigene Namen und Zuordnungen bleiben erhalten. Rohrleitungen werden nicht automatisch verbunden.","Detected values will be added without changing existing names or mappings. Pipework is never inferred.")}</p>
        <button type="button" data-action="ems-circuits-apply">${t("Heizkreise übernehmen","Add heating circuits")}</button>
      </section>`:'';
      const emsDhwInfo=pendingEmsDhw.length?`<section class="hpc-ems">
        <h3>${t("EMS-ESP-Warmwasser erkannt","EMS-ESP hot-water storage found")}</h3>
        <p>${t("Speichertemperatur gefunden. Bestehende Messwerte und Rohrverbindungen bleiben erhalten.","Storage temperature found. Existing sensor choices and pipework will be preserved.")}</p>
        <button type="button" data-action="ems-dhw-apply">${t("Warmwasserspeicher übernehmen","Add hot-water tank")}</button>
      </section>`:'';
      const etaLabel=chosenEta?({ehack:'ETA eHACK',hack:'ETA HACK',hack_vr:'ETA HACK VR'}[chosenEta.model]||'ETA Hackschnitzelkessel'):'';
      const etaInfo=chosenEta?`<section class="hpc-ems">
        <h3>${t("ETA Hackschnitzelkessel automatisch erkannt","ETA wood-chip boiler detected")}</h3>
        <p><strong>${esc(chosenEta.name)}</strong> · ${esc(etaLabel)} · ${esc(chosenEta.source)}</p>
        <p>${chosenEta.count} ${t("Messwerte aus Home Assistant erkannt. Du kannst die Zuordnung vor dem Speichern prüfen. Es werden keine Kesselbefehle gesendet.","Home Assistant values detected. Review assignments after adding. No boiler commands are sent.")}</p>
        <button type="button" data-action="eta-apply">${t("ETA-Kessel und Sensoren übernehmen","Add ETA boiler and sensors")}</button>
      </section>`:'';
      const etaPartInfo=chosenEtaPart?`<section class="hpc-ems">
        <h3>${t("ETA-Anlagenbauteil erkannt","ETA system component detected")}</h3>
        <p><strong>${esc(chosenEtaPart.name)}</strong> · ${chosenEtaPart.count} ${t("Messwerte","values")}</p>
        <p>${t("Nur eindeutig benannte Bauteile werden übernommen. Hydraulische Leitungen werden nicht geraten. Bestehende Einstellungen bleiben erhalten.","Only clearly named components are imported. Hydraulic connections are not guessed. Existing settings are preserved.")}</p>
        <button type="button" data-action="eta-part-apply">${t("Bauteil und Messwerte übernehmen","Add component and values")}</button>
      </section>`:'';
      const selected=p.components.find(c=>c.id===this._selectedId)||p.components[0];
      if(selected)this._selectedId=selected.id;
      // Native Home Assistant ha-form matches the original card's entity setup.
      const useNativeForm=!!globalThis.customElements?.get('ha-form');
      const useNativePicker=!!globalThis.customElements?.get('ha-entity-picker');
      const hcMixed=selected?.type==='heating_circuit'
        ?(typeof selected.options?.mixed==='boolean'?selected.options.mixed:
          !!(selected.sensors.mixer||selected.sensors.mixer_opening||selected.sensors.mixer_closing))
        :false;
      // Mixer measurement is always available on a mixed heating circuit.
      // Only a wood-gasifier return-lift mixer belongs behind a separate toggle.
      const activeFields=selected?HPC_FREE.byType[selected.type].fields.filter(key=>
        (!['particle_state','particle_voltage','particle_current'].includes(key)||
         selected.options?.particle_separator===true)&&
        (!['mixer','mixer_opening','mixer_closing'].includes(key)||
        selected.type==='heating_circuit'&&hcMixed||
        key==='mixer'&&selected.type==='wood_gasifier'&&selected.options?.return_lift)):[];
      const mainFields={wood_gasifier:['state','flow','return','pump'],oil_boiler:['state','flow','return','pump'],
        pellet_boiler:['state','flow','return','pump'],gas_boiler:['state','flow','return','pump'],
        heat_pump:['state','compressor','flow','return','power'],buffer:['top','middle','bottom'],
        dhw_tank:['top','middle','bottom'],heating_circuit:['flow','return','pump','mixer'],
        pump:['state','volume'],mixer:['position','state'],diverter:['position','state'],
        electric_heater:['state','power'],wood_chip_boiler:['state','flow','return','pump','particle_state'],
        particle_separator:['state','voltage','current'],manifold:[]};
      const coreFields=activeFields.filter(key=>(mainFields[selected.type]||[]).includes(key));
      const moreFields=activeFields.filter(key=>!coreFields.includes(key));
      const sensors=Object.keys(this._hass?.states||{}).filter(id=>/^[a-z][a-z0-9_]*\.[a-z0-9_]+$/.test(id));
      const dataList=`<datalist id="hpc-free-entities">${sensors.slice(0,8000).map(id=>`<option value="${esc(id)}"></option>`).join("")}</datalist>`;
      const categories=[
        ["source",t("Wärmeerzeuger und Kessel","Heat sources and boilers")],
        ["storage",t("Speicher","Storage")],
        ["load",t("Heizkreise","Heating circuits")],
        ["control",t("Pumpen, Mischer und Verteiler","Pumps, valves and manifolds")]
      ];
      const sourceTypeOptions=HPC_FREE.types.filter(item=>item.group==='source')
        .map(item=>`<option value="${esc(item.type)}">${esc(HPC_FREE.display(item.type,lang))}</option>`).join("");
      const countSelect=(type,max)=>`<select data-setup-count="${esc(type)}">${
        Array.from({length:max+1},(_,n)=>`<option value="${n}">${n}</option>`).join("")}</select>`;
      const setupGroups=`<details class="hpc-category" open>
        <summary><strong>${t("Anlagenaufbau","System layout")}</strong></summary>
        <div class="hpc-category-body">
          <div class="hpc-count-row"><label>${t("Anzahl Wärmeerzeuger","Number of heat sources")}</label>${countSelect('source',6)}</div>
          <div data-setup-source-types></div>
          <div class="hpc-count-row"><label>${t("Anzahl Pufferspeicher","Number of buffer tanks")}</label>${countSelect('buffer',6)}</div>
          <div class="hpc-count-row"><label>${t("Anzahl Warmwasserspeicher","Number of hot-water tanks")}</label>${countSelect('dhw_tank',4)}</div>
          <div class="hpc-count-row"><label>${t("Anzahl Heizkreise","Number of heating circuits")}</label>${countSelect('heating_circuit',6)}</div>
        </div></details>`;
      const typeOptions=categories.map(([group,label])=>`<optgroup label="${esc(label)}">${HPC_FREE.types
        .filter(c=>c.group===group&&c.type!=='particle_separator')
        .map(c=>`<option value="${esc(c.type)}">${esc(HPC_FREE.display(c.type,lang))}</option>`).join("")}</optgroup>`).join("");
      const portNames={
        flow:t("Vorlauf","Flow"),return:t("Rücklauf","Return"),dhw:t("Warmwasser","Hot water"),
        flow_in:t("Vorlauf Eingang","Flow inlet"),return_out:t("Rücklauf Ausgang","Return outlet"),
        top_in:t("Oben hinein","Top in"),top_out:t("Oben heraus","Top out"),
        mid_in:t("Mitte hinein","Middle in"),mid_out:t("Mitte heraus","Middle out"),
        bottom_in:t("Unten hinein","Bottom in"),bottom_out:t("Unten heraus","Bottom out"),
        coil_in:t("Wärmetauscher hinein","Coil in"),coil_out:t("Wärmetauscher heraus","Coil out"),
        hot_out:t("Warmwasser hinaus","Hot water out"),cold_in:t("Kaltwasser hinein","Cold water in"),
        in:t("Eingang","Inlet"),out:t("Ausgang","Outlet"),
        a:"A",b:"B",ab:"AB",c:"C",d:"D",e:"E",f:"F",
      };
      const portOptions=(role,selectedFrom="")=>p.components.map(c=>{
        const list=HPC_FREE.ports(c.type).filter(port=>{
          if(role==="from")return HPC_FREE.portRole(c.type,port.id)!=="in";
          const [fromId,fromPort]=selectedFrom.split("|");
          return !!fromId&&HPC_FREE.validConnection(p,fromId,fromPort,c.id,port.id);
        });
        if(!list.length)return "";
        return `<optgroup label="${esc(c.name)}">${list.map(port=>`<option value="${esc(c.id+"|"+port.id)}">${esc(portNames[port.id]||port.id)}</option>`).join("")}</optgroup>`;
      }).join("");
      const heatingSources=p.components.filter(c=>
        c.type==='buffer'||HPC_FREE.byType[c.type]?.group==='source'||c.type==='manifold');
      const heatingSupply=selected?.type==='heating_circuit'
        ?p.connections.find(edge=>edge.to===selected.id&&edge.to_port==='flow_in'):null;
      const heatingReturn=selected?.type==='heating_circuit'
        ?p.connections.find(edge=>edge.from===selected.id&&edge.from_port==='return_out'):null;
      const heatingComplete=!!heatingSupply&&!!heatingReturn;
      const automaticRoute=selected?.options?.hydraulic_auto;
      const currentHeatingSource=automaticRoute?.source||heatingSupply?.from||heatingReturn?.to||
        (selected?.type==='heating_circuit'?HPC_FREE.preferredHeatingBuffer(p):'')||'';
      const heatingSourceOptions=heatingSources.map(node=>
        `<option value="${esc(node.id)}" ${currentHeatingSource===node.id?'selected':''}>${esc(node.name)} · ${esc(HPC_FREE.display(node.type,lang))}</option>`
      ).join('');
      const heatingControls=p.components.filter(node=>
        ['mixer','pump'].includes(node.type)&&
        !p.connections.some(edge=>edge.from===node.id||edge.to===node.id));
      const sensorField=(id,key,value)=>`<label class="hpc-field">${esc(HPC_FREE.fieldLabel(key,lang))}
        <input type="text" list="hpc-free-entities" autocomplete="off" data-sensor="${esc(id)}" data-field="${esc(key)}"
          value="${esc(value||"")}" placeholder="${t("Home Assistant-Entität","Home Assistant entity")}"/></label>`;
      const extraRows=(selected?.level_sensors||[]).map((point,index)=>`<div class="hpc-row">
        <label>${t("Höhe von oben (%)","Height from top (%)")}<input type="number" min="0" max="100" step="0.1"
          data-level-pos="${esc(selected.id)}" data-level-index="${index}" value="${point.position}"/></label>
        <label>${t("Temperaturfühler","Temperature sensor")}<input list="hpc-free-entities"
          data-level-entity="${esc(selected.id)}" data-level-index="${index}" value="${esc(point.entity)}"/></label>
        <button data-action="remove-level" data-index="${index}" type="button">${t("Löschen","Delete")}</button></div>`).join("");
      const isTank=selected&&["buffer","dhw_tank"].includes(selected.type);
      const bufferList=p.components.filter(c=>c.type==="buffer");
      const misplacedBufferEdges=p.connections.filter(e=>{
        const from=p.components.find(c=>c.id===e.from),to=p.components.find(c=>c.id===e.to);
        return from?.type==="buffer"&&to?.type==="buffer"&&e.from_port==="bottom_out"&&e.to_port==="top_in";
      });
      // Keep the complete original outdoor-unit illustration selector.
      // The same familiar manufacturer and cabinet choices are available
      // directly on each heat pump instead of buried in classic YAML fields.
      const unitLabels={
        auto:t('Automatisch','Automatic'),generic:t('Standardgerät','Generic unit'),
        lambda:'Lambda',vaillant:'Vaillant',panasonic:'Panasonic Aquarea',
        viessmann:'Viessmann',bosch:'Bosch / Buderus',saunier:'Saunier Duval',
        samsung:'Samsung',wolf:'Wolf',kronoterm:'Kronoterm',
        alpha_innotec:'alpha innotec',stiebel:'Stiebel Eltron',
        buderus_wpls_13_2:'Buderus WPLS 13.2 (2 Lüfter)'
      };
      const heatPumpChoices=selected?.type==='heat_pump'
        ?`<h3>${t("Außengerät wie in der Originalkarte","Original outdoor-unit style")}</h3>
          <div class="hpc-row">
            <label class="hpc-field">${t("Darstellung des Außengeräts","Outdoor-unit appearance")}
              <select data-wp-style="${esc(selected.id)}">
                ${HPC_WPLS_UNIT_STYLES.map(style=>`<option value="${style}" ${(selected.options?.unit_style||'auto')===style?'selected':''}>${esc(unitLabels[style]||style)}</option>`).join('')}
              </select>
            </label>
            <label class="hpc-field">${t("Gerätegröße / Lüfter","Unit size / fans")}
              <select data-wp-size="${esc(selected.id)}">
                <option value="" ${!selected.options?.unit_size?'selected':''}>${t("Automatisch","Automatic")}</option>
                ${[['small',t('Klein','Small')],['medium',t('Mittel','Medium')],['large',t('Groß / zwei Lüfter','Large / two fans')]]
                  .map(([value,label])=>`<option value="${value}" ${selected.options?.unit_size===value?'selected':''}>${label}</option>`).join('')}
              </select>
            </label>
          </div>`:'';
      const chosen=selected?`<h3 class="hpc-config-title">${HPC_FREE.icon(selected.type)} ${t("Bauteil konfigurieren","Configure component")}</h3>
        <div class="hpc-row"><label>${t("Bezeichnung","Name")}<input data-name="${esc(selected.id)}"
          maxlength="75" value="${esc(selected.name)}"/></label>
          <button type="button" data-action="remove-component">${t("Entfernen","Remove")}</button></div>
        ${selected.type==="wood_gasifier"?`<label class="hpc-checkbox">
          <input type="checkbox" data-return-lift="${esc(selected.id)}" ${selected.options?.return_lift?"checked":""}/>
          <span>${t("Rücklaufanhebung am Holzvergaser","Return-temperature lift at wood gasifier")}</span>
        </label>
        <p>${t("Die Rücklaufanhebung wird direkt hinter dem Kessel eingezeichnet. Ein zusätzlicher Mischer ist dafür nicht erforderlich. Den Pumpenstatus und die Mischerstellung kannst du unten zuordnen.","The return-temperature lift is drawn behind the boiler. No separate mixer component is needed. You can map its pump state and mixer position below.")}</p>`:""}
        ${selected.type==="gas_boiler"?`<label class="hpc-field">${t("Wärmeerzeuger korrigieren","Correct heat source")}
          <select data-source-type="${esc(selected.id)}">
            <option value="gas_boiler" selected>${t("Gaskessel","Gas boiler")}</option>
            <option value="oil_boiler">${t("Ölkessel (mit Brenner)","Oil boiler (with burner)")}</option>
          </select></label>`:""}
        ${["oil_boiler","gas_boiler","pellet_boiler"].includes(selected.type)?`<label class="hpc-field">${t("Kesselbauart","Boiler construction")}
          <select data-boiler-kind="${esc(selected.id)}">
            ${[["standard",t("Standardkessel","Standard boiler")],["low_temp",t("Niedertemperaturkessel","Low-temperature boiler")],["condensing",t("Brennwertkessel","Condensing boiler")]]
             .map(([id,name])=>`<option value="${id}" ${(selected.options?.boiler_kind||"standard")===id?"selected":""}>${name}</option>`).join("")}
          </select></label>`:""}
        ${["heating_circuit","mixer","wood_gasifier"].includes(selected.type)?`<label class="hpc-checkbox">
          <input type="checkbox" data-mixer-inverted="${esc(selected.id)}" ${selected.options?.mixer_inverted?"checked":""}/>
          <span>${t("Mischerstellung invertieren (0 % = heiß)","Invert mixer position (0% = hot)")}</span>
        </label>`:""}
        ${selected.type==="heating_circuit"?`<label class="hpc-checkbox">
          <input type="checkbox" data-hc-mixer="${esc(selected.id)}" ${hcMixed?'checked':''}/>
          <span>${t("Heizkreis mit Mischer","Heating circuit with mixing valve")}</span>
        </label>
        ${hcMixed?`<p>${t("Mischerstellung als Entität unter Messwerte zuordnen. Ohne Messwert wird der Mischer nur als Bauteil angezeigt.","Assign the mixer position under measured values. Without a value, only the mixing valve symbol is shown.")}</p>`:''}`:""}
        ${selected.type==="heating_circuit"?`<label class="hpc-field">${t("Heizflächenart","Heat emitter")}
          <select data-heating-emitter="${esc(selected.id)}">
            ${[['underfloor',t('Fußboden- / Flächenheizung','Underfloor heating')],
              ['radiator',t('Plattenheizkörper','Panel radiators')],
              ['column',t('Gliederheizkörper','Column radiators')]]
              .map(([id,label])=>`<option value="${id}" ${(selected.options?.emitter||'radiator')===id?'selected':''}>${label}</option>`).join('')}
          </select></label>`:""}
        ${selected.type==="heating_circuit"?`<section class="hpc-ems" data-heating-connection>
          <h3>${t("Heizkreis anschließen","Connect heating circuit")}</h3>
          ${heatingComplete
            ?`<p>${t("Vorlauf und Rücklauf sind angeschlossen.","Supply and return are connected.")}</p>`
            :`<p class="hpc-connection-warning">${t(`Heizkreis ${esc(selected.name)} ist noch nicht vollständig angeschlossen.`,`Heating circuit ${esc(selected.name)} is not fully connected yet.`)}</p>
              ${heatingSupply?`<p>${t("Vorlauf vorhanden; Rücklauf fehlt.","Supply exists; return is missing.")}</p>`:""}
              ${heatingReturn?`<p>${t("Rücklauf vorhanden; Vorlauf fehlt.","Return exists; supply is missing.")}</p>`:""}`}
          <div class="hpc-row">
            <label>${t("Wärmequelle","Heat source")}<select data-hc-source="${esc(selected.id)}">
              <option value="">${t("Auswählen","Choose")}</option>${heatingSourceOptions}
            </select></label>
            <label>${t("Anschlussart","Connection type")}<select data-hc-kind="${esc(selected.id)}">
              <option value="direct" ${automaticRoute?.kind==='direct'?'selected':''}>${t("Direkt","Direct")}</option>
              <option value="pump" ${automaticRoute?.kind==='pump'?'selected':''}>${t("Über vorhandene Pumpengruppe","Via existing pump group")}</option>
              <option value="mixer" ${automaticRoute?.kind==='mixer'?'selected':''}>${t("Über vorhandenen Mischer","Via existing mixer")}</option>
              <option value="custom">${t("Benutzerdefinierter Anschluss","Custom connection")}</option>
            </select></label>
            <label>${t("Verbindung","Connection")}<select data-hc-mode="${esc(selected.id)}">
              <option value="automatic" selected>${t("Automatisch","Automatic")}</option>
              <option value="manual">${t("Manuell","Manual")}</option>
            </select></label>
          </div>
          <label class="hpc-field" data-hc-control-wrap ${['pump','mixer'].includes(automaticRoute?.kind)?'':'hidden'}>${t("Vorhandene Pumpengruppe / Mischer","Existing pump group / mixer")}
            <select data-hc-control="${esc(selected.id)}">
              <option value="">${t("Auswählen","Choose")}</option>
              ${heatingControls.map(node=>`<option value="${esc(node.id)}">${esc(node.name)} · ${esc(HPC_FREE.display(node.type,lang))}</option>`).join('')}
            </select>
          </label>
          <div class="hpc-actions">
            <button type="button" class="hpc-primary" data-action="hc-connect" data-component="${esc(selected.id)}"
              ${heatingSources.length?'':'disabled'}>${heatingComplete?t("Verbindung ändern","Change connection"):t("Mit Wärmequelle verbinden","Connect to heat source")}</button>
          </div>
          <p>${t("Bei genau einem Pufferspeicher wird ein neuer Heizkreis automatisch mit Vorlauf und Rücklauf verbunden. Bestehende manuelle Leitungen werden nicht verändert.","With exactly one buffer, a new heating circuit is automatically connected with both supply and return. Existing manual pipes are never changed.")}</p>
          <details class="hpc-advanced-pipes" data-hc-manual-wrap hidden>
            <summary>${t("Technische Anschlüsse (erweitert)","Technical ports (advanced)")}</summary>
            <p>${t("Im manuellen Modus Vorlauf und Rücklauf getrennt über „Spezielle Anschlüsse“ konfigurieren.","In manual mode, configure supply and return separately under “Connect individual ports”.")}</p>
          </details>
        </section>`:""}
        ${selected.type==="mixer"?`<div class="hpc-ems">
          <strong>${t("Hydraulische Mischerwege","Hydraulic mixer paths")}</strong>
          <p>${t("0 % oder 100 % sperren keinen Weg automatisch. Trage nur einen bestätigten Sperrzustand oder eine bekannte geschlossene Stellung ein.","0% or 100% never close a path by assumption. Enter only a confirmed closed state or known closed position.")}</p>
          <div class="hpc-row">
            <label>${t("Sensorwert: Weg A–AB gesperrt","State: path A–AB closed")}
              <input data-mixer-a-state="${esc(selected.id)}" maxlength="60"
                value="${esc(selected.options?.a_closed_state||'')}"/></label>
            <label>${t("Sensorwert: Weg B–AB gesperrt","State: path B–AB closed")}
              <input data-mixer-b-state="${esc(selected.id)}" maxlength="60"
                value="${esc(selected.options?.b_closed_state||'')}"/></label>
          </div>
          <div class="hpc-row">
            <label>${t("Stellung, bei der A–AB sicher gesperrt ist (%)","Position where A–AB is confirmed closed (%)")}
              <input data-mixer-a-position="${esc(selected.id)}" type="number" min="0" max="100" step="0.1"
                value="${esc(selected.options?.a_closed_at??'')}"/></label>
            <label>${t("Stellung, bei der B–AB sicher gesperrt ist (%)","Position where B–AB is confirmed closed (%)")}
              <input data-mixer-b-position="${esc(selected.id)}" type="number" min="0" max="100" step="0.1"
                value="${esc(selected.options?.b_closed_at??'')}"/></label>
          </div>
        </div>`:""}
        ${selected.type==="diverter"?`<div class="hpc-ems">
           <strong>${t("Umschaltventil","Changeover valve")}</strong>
           <p>${t("Lege fest, an welchem Ventilausgang die Warmwasserladung angeschlossen ist. Ohne eindeutig zugeordneten Ventilzustand bleibt der Fluss in beiden Abgängen inaktiv.","Choose the DHW outlet. Without an unambiguous valve state both outlets remain without flow animation.")}</p>
           <label class="hpc-field">${t("Warmwasser-Ausgang","DHW outlet")}
             <select data-diverter-port="${esc(selected.id)}">
               <option value="a" ${selected.options?.dhw_port!=='b'?'selected':''}>A</option>
               <option value="b" ${selected.options?.dhw_port==='b'?'selected':''}>B</option>
             </select></label>
           <label class="hpc-field">${t("Ventilwert für Warmwasser","Valve value for DHW")}
             <input data-diverter-dhw="${esc(selected.id)}" maxlength="60"
               value="${esc(selected.options?.dhw_state||'')}" placeholder="WW"/></label>
           <label class="hpc-field">${t("Ventilwert für Heizen","Valve value for heating")}
             <input data-diverter-heating="${esc(selected.id)}" maxlength="60"
               value="${esc(selected.options?.heating_state||'')}" placeholder="Heizen"/></label>
           <p>${t("Bei Zahlenwerten wie 0 oder 100 bitte beide tatsächlich gemessenen Ventilstellungen eintragen.","For numerical states such as 0 or 100, enter the actual measured valve values.")}</p>
         </div>`:""}
        ${selected.type==="wood_chip_boiler"?`<label class="hpc-field">${t("ETA Kesselmodell","ETA boiler model")}
          <select data-eta-model="${esc(selected.id)}">
            ${[["ehack","ETA eHACK"],["hack","ETA HACK"],["hack_vr","ETA HACK VR"]]
              .map(([id,name])=>`<option value="${id}" ${(selected.options?.eta_model||"ehack")===id?"selected":""}>${name}</option>`).join("")}
          </select></label>
          ${(selected.options?.eta_model||"ehack")==="ehack"?`<label class="hpc-field">${t("Kesselansicht","Boiler artwork")}
            <select data-eta-view="${esc(selected.id)}">
              <option value="closed" ${(selected.options?.eta_view||"closed")==="closed"?"selected":""}>${t("Original geschlossen","Original closed")}</option>
              <option value="cutaway" ${selected.options?.eta_view==="cutaway"?"selected":""}>${t("Schnittbild mit Feuer","Cutaway with flames")}</option>
            </select></label>`:""}`:""}
        ${selected.type==="dhw_tank"?`<label class="hpc-field">${t("Heizwendel-Anbindung","Heat-exchanger connection")}
          <select data-dhw-style="${esc(selected.id)}">
            <option value="branch" ${selected.options?.connection_style==='branch'?'selected':''}>${t("Abzweig vom gemeinsamen Vorlauf und Rücklauf (wie Heizkreis)","Branch from shared supply and return (like a heating circuit)")}</option>
            <option value="separate" ${selected.options?.connection_style!=='branch'?'selected':''}>${t("Eigener Ladevorlauf und Rücklauf","Separate charging supply and return")}</option>
          </select></label>`:""}
        ${["wood_chip_boiler","pellet_boiler"].includes(selected.type)?`<label class="hpc-checkbox">
          <input type="checkbox" data-fuel-silo="${esc(selected.id)}" ${selected.options?.silo?'checked':''}/>
          <span>${t(selected.type==="pellet_boiler"?"Pelletsilo anzeigen":"Hackschnitzelsilo anzeigen",selected.type==="pellet_boiler"?"Show pellet silo":"Show wood-chip silo")}</span>
        </label>
        <p>${t("Silo wird mit der Brennstoffzuführung direkt am Kessel angezeigt. Füllstand unter Messwerte zuordnen.","The silo is shown with its fuel-feed connection at the boiler. Assign its level under measured values.")}</p>`:""}
        ${selected.type==="wood_chip_boiler"?`<label class="hpc-checkbox">
          <input type="checkbox" data-eta-particle="${esc(selected.id)}" ${selected.options?.particle_separator?'checked':''}/>
          <span>${t("Partikelabscheider am Hackgutautomaten","Particle separator on wood-chip boiler")}</span>
        </label>
        <p>${t("Teil der Abgasführung, ohne eigene Vor- oder Rücklaufleitung. Betriebsstatus, Hochspannung und Strom können unter Messwerte zugeordnet werden. Die Abgastemperatur steht am Abgasrohr.","Part of the flue-gas path, with no hydraulic connections. Assign operating state, voltage and current under measured values. Flue temperature is shown on the exhaust duct.")}</p>`:""}
        ${heatPumpChoices}
        <p class="hpc-field-hint">${t("Alle Datenpunkte sind optional. Wähle eine Entität aus oder lasse das Feld leer. Auch Status-Sensoren anderer Integrationen sind zulässig.","All data points are optional. Assign an entity or leave the field empty. Status sensors from other integrations are supported.")}</p>
        ${useNativeForm?'<div class="hpc-native-form"><ha-form id="hpc-native-sensors"></ha-form></div>':activeFields.map(key=>sensorField(selected.id,key,selected.sensors[key])).join("")}
        ${isTank?`<h3>${t("Zusätzliche Temperaturfühler","Additional temperature sensors")}</h3>
          <p>${t("Ordne jeden Fühler seiner tatsächlichen Einbauhöhe zu. 0 % = oben, 100 % = unten.","Set each sensor to its real installation height. 0% = top, 100% = bottom.")}</p>
          ${extraRows}<button type="button" data-action="add-level">${t("Weiteren Fühler hinzufügen","Add temperature sensor")}</button>`:""}`:"";
      const sensorPicker=(node,key,label)=>useNativePicker
        ?`<label class="hpc-field">${esc(label)}<ha-entity-picker data-sensor="${esc(node.id)}" data-field="${esc(key)}"
            data-kind="${sensorKind(key)}"
            data-label="${esc(label)}" data-focus-key="sensor:${esc(node.id)}:${esc(key)}"></ha-entity-picker></label>`
        :`<label class="hpc-field">${esc(label)}<input list="hpc-free-entities" data-sensor="${esc(node.id)}"
            data-field="${esc(key)}" data-focus-key="sensor:${esc(node.id)}:${esc(key)}"
            value="${esc(node.sensors?.[key]||'')}"/></label>`;
      const sensorKind=key=>({
        state:'onoff',compressor:'onoff',fan_speed:'speed',defrost:'onoff',fault:'onoff',
        compressor_speed:'speed',pump:'onoff',heater:'onoff',mixer:'percent',mixer_opening:'onoff',
        mixer_closing:'onoff',position:'percent',flow:'temperature',return:'temperature',
        top:'temperature',middle:'temperature',bottom:'temperature',target:'temperature',
        exhaust:'temperature',oxygen:'percent',power:'power',volume:'flowrate',
        fuel_level:'percent',starts:'counter',fan:'speed',fuel_feed:'onoff',
        ash_removal:'onoff',particle_state:'onoff'
      })[key]||'';
      // Legacy form retains its own recommendations. Component pickers show
      // the complete Home Assistant entity list, not just guessed matches.
      const routeFrom=(startId,startPort,targetId,targetPort)=>{
        const queue=[{nodeId:startId,edgeIds:[]}],seen=new Set();
        while(queue.length){
          const current=queue.shift();
          for(const edge of p.connections.filter(item=>item.from===current.nodeId&&
            (!current.edgeIds.length||item.from_port!=='')&&
            (current.edgeIds.length||item.from_port===startPort))){
            if(seen.has(edge.id))continue;
            seen.add(edge.id);
            const edgeIds=[...current.edgeIds,edge.id];
            if(edge.to===targetId&&edge.to_port===targetPort)return edgeIds;
            const next=p.components.find(item=>item.id===edge.to);
            if(HPC_FREE.byType[next?.type]?.group==='control')
              queue.push({nodeId:next.id,edgeIds});
          }
        }
        return null;
      };
      const dhwRouteFor=tank=>{
        const candidates=p.components.filter(node=>node.type==='buffer'||
          HPC_FREE.byType[node.type]?.group==='source');
        let anyFlow=false,anyReturn=false;
        for(const source of candidates){
          const sourceOut=source.type==='buffer'?'top_out':
            source.type==='oil_boiler'?'dhw':'flow';
          const sourceReturn=source.type==='buffer'?'bottom_in':'return';
          const flow=routeFrom(source.id,sourceOut,tank.id,'coil_in');
          const back=routeFrom(tank.id,'coil_out',source.id,sourceReturn);
          anyFlow ||= !!flow;
          anyReturn ||= !!back;
          if(flow&&back)return {source,flow,back,complete:true};
        }
        return {flow:anyFlow,back:anyReturn,complete:false};
      };
      const componentCard=node=>{
        const group=HPC_FREE.byType[node.type]?.group;
        const fields=HPC_FREE.byType[node.type].fields.filter(key=>
          (!['particle_state','particle_voltage','particle_current'].includes(key)||
            node.options?.particle_separator===true)&&
          (!['mixer','mixer_opening','mixer_closing'].includes(key)||
            node.type==='heating_circuit'&&node.options?.mixed!==false||
            key==='mixer'&&node.type==='wood_gasifier'&&node.options?.return_lift));
        const core={
          wood_gasifier:['state','flow','return','pump'],oil_boiler:['state','flow','return','pump'],
          pellet_boiler:['state','flow','return','pump'],gas_boiler:['state','flow','return','pump'],
          heat_pump:['state','compressor','flow','return','power'],wood_chip_boiler:['state','flow','return','pump','particle_state'],
          buffer:['top','middle','bottom'],dhw_tank:['top','middle','bottom'],
          heating_circuit:['flow','return','target','pump','mixer'],pump:['state','volume'],
          mixer:['position','state'],diverter:['position','state'],electric_heater:['state','power'],
          particle_separator:['state','voltage','current'],manifold:[]
        }[node.type]||[];
        const main=fields.filter(key=>core.includes(key));
        const more=fields.filter(key=>!main.includes(key));
        const sourceTypes=HPC_FREE.types.filter(item=>item.group===group);
        const typeSelect=sourceTypes.length>1
          ?`<label>${t('Gerätetyp','Equipment type')}<select data-component-type="${esc(node.id)}"
              data-focus-key="type:${esc(node.id)}">${sourceTypes.map(item=>
                `<option value="${esc(item.type)}" ${item.type===node.type?'selected':''}>${esc(HPC_FREE.display(item.type,lang))}</option>`).join('')}
            </select></label>`:'';
        const assigned=p.connections.filter(edge=>edge.from===node.id||edge.to===node.id);
        const edgeSummary=assigned.map(edge=>{
          const other=p.components.find(item=>item.id===
            (edge.from===node.id?edge.to:edge.from));
          const otherName=other?.name||(edge.from===node.id?edge.to:edge.from);
          return esc((edge.from===node.id?'→ ':'← ')+otherName);
        });
        const nameInput=`<label class="hpc-field">${t('Bezeichnung','Name')}
          <input data-name="${esc(node.id)}" data-focus-key="name:${esc(node.id)}"
            maxlength="75" value="${esc(node.name)}"/></label>`;
        const sensorInputs=main.map(key=>sensorPicker(node,key,HPC_FREE.fieldLabel(key,lang))).join('');
        const moreInputs=more.length?`<details data-panel="more-sensors:${esc(node.id)}">
          <summary>${t('Weitere Messwerte','Additional measurements')}</summary>
          ${more.map(key=>sensorPicker(node,key,HPC_FREE.fieldLabel(key,lang))).join('')}
        </details>`:'';
        const levels=['buffer','dhw_tank'].includes(node.type)?`<details data-panel="levels:${esc(node.id)}">
          <summary>${t('Zusätzliche Temperaturfühler','Additional temperature sensors')}</summary>
          <p>${t('Einbauhöhe von oben: 0 % = oben, 100 % = unten.','Height from top: 0% = top, 100% = bottom.')}</p>
          ${(node.level_sensors||[]).map((point,index)=>`<div class="hpc-row">
            <label>${t('Höhe von oben (%)','Height from top (%)')}<input type="number" min="0" max="100" step="0.1"
              data-level-pos="${esc(node.id)}" data-level-index="${index}" value="${point.position}"/></label>
            <label>${t('Temperaturfühler','Temperature sensor')}<ha-entity-picker data-level-entity="${esc(node.id)}"
              data-level-index="${index}" data-kind="temperature"
              data-label="${esc(t('Temperaturfühler','Temperature sensor'))}"></ha-entity-picker></label>
            <button type="button" data-action="remove-level" data-component="${esc(node.id)}"
              data-index="${index}">${t('Entfernen','Remove')}</button></div>`).join('')}
          <button type="button" data-action="add-level" data-component="${esc(node.id)}">
            ${t('Fühler hinzufügen','Add sensor')}</button></details>`:'';
        let specialized='';
        let appearance='';
        if(node.type==='heat_pump'){
          appearance=`<div class="hpc-row"><label>${t('Darstellung des Außengeräts','Outdoor unit style')}
            <select data-wp-style="${esc(node.id)}">${HPC_WPLS_UNIT_STYLES.map(style=>
              `<option value="${style}" ${(node.options?.unit_style||'auto')===style?'selected':''}>${esc(unitLabels[style]||style)}</option>`).join('')}</select></label>
            <label>${t('Gerätegröße / Lüfter','Unit size / fans')}<select data-wp-size="${esc(node.id)}">
              <option value="" ${!node.options?.unit_size?'selected':''}>${t('Automatisch','Automatic')}</option>
              ${[['small',t('Klein','Small')],['medium',t('Mittel','Medium')],['large',t('Groß / zwei Lüfter','Large / two fans')]]
                .map(([value,label])=>`<option value="${value}" ${node.options?.unit_size===value?'selected':''}>${label}</option>`).join('')}
            </select></label></div>`;
        }
        if(['oil_boiler','gas_boiler','pellet_boiler'].includes(node.type)){
          specialized+=`<label>${t('Kesselbauart','Boiler construction')}<select data-boiler-kind="${esc(node.id)}">
            ${[['standard',t('Standardkessel','Standard boiler')],['low_temp',t('Niedertemperaturkessel','Low-temperature boiler')],['condensing',t('Brennwertkessel','Condensing boiler')]]
              .map(([id,label])=>`<option value="${id}" ${(node.options?.boiler_kind||'standard')===id?'selected':''}>${label}</option>`).join('')}
          </select></label>`;
        }
        if(node.type==='wood_gasifier'){
          appearance+=`<label>${t('Fröling-Darstellung','Fröling artwork')}<select data-froeling-view="${esc(node.id)}">
            <option value="s3_turbo" ${(node.options?.froeling_view||'s3_turbo')==='s3_turbo'?'selected':''}>Fröling S3 Turbo · ${t('Schnittbild','Cutaway')}</option>
            <option value="classic" ${node.options?.froeling_view==='classic'?'selected':''}>${t('Klassisch','Classic')}</option>
          </select></label>`;
          specialized+=`<label class="hpc-checkbox"><input type="checkbox" data-return-lift="${esc(node.id)}"
            ${node.options?.return_lift?'checked':''}/><span>${t('Rücklaufanhebung vorhanden','Return-temperature lift installed')}</span></label>`;
        }
        if(['wood_gasifier','heating_circuit','mixer'].includes(node.type)){
          specialized+=`<label class="hpc-checkbox"><input type="checkbox" data-mixer-inverted="${esc(node.id)}"
            ${node.options?.mixer_inverted?'checked':''}/><span>${t('Mischerstellung invertieren (0 % = heiß)','Invert mixer position (0% = hot)')}</span></label>`;
        }
        if(node.type==='wood_chip_boiler'){
          specialized+=`<label>${t('ETA Kesselmodell','ETA boiler model')}<select data-eta-model="${esc(node.id)}">
            ${[['ehack','ETA eHACK'],['hack','ETA HACK'],['hack_vr','ETA HACK VR']].map(([id,label])=>
              `<option value="${id}" ${(node.options?.eta_model||'ehack')===id?'selected':''}>${label}</option>`).join('')}
          </select></label>
          ${(node.options?.eta_model||'ehack')==='ehack'?`<label>${t('Kesselansicht','Boiler artwork')}
            <select data-eta-view="${esc(node.id)}">
              ${[['closed',t('Original geschlossen','Original closed')],['cutaway',t('Schnittbild mit Feuer','Cutaway with flames')]].map(([value,label])=>
                `<option value="${value}" ${(node.options?.eta_view||'closed')===value?'selected':''}>${label}</option>`).join('')}
            </select></label>`:''}
          <label class="hpc-checkbox"><input type="checkbox" data-eta-particle="${esc(node.id)}"
            ${node.options?.particle_separator?'checked':''}/><span>${t('Partikelabscheider','Particle separator')}</span></label>`;
        }
        if(['wood_chip_boiler','pellet_boiler'].includes(node.type)){
          specialized+=`<label class="hpc-checkbox"><input type="checkbox" data-fuel-silo="${esc(node.id)}"
            ${node.options?.silo?'checked':''}/><span>${t('Brennstoffsilo anzeigen','Show fuel silo')}</span></label>`;
        }
        if(node.type==='heating_circuit'){
          const feed=p.connections.find(edge=>edge.to===node.id&&edge.to_port==='flow_in');
          const back=p.connections.find(edge=>edge.from===node.id&&edge.from_port==='return_out');
          const automatic=node.options?.hydraulic_auto;
          const sourceId=automatic?.source||feed?.from||back?.to||HPC_FREE.preferredHeatingBuffer(p)||'';
          const complete=!!feed&&!!back;
          const controls=p.components.filter(item=>['pump','mixer'].includes(item.type)&&
            (!p.connections.some(edge=>edge.from===item.id||edge.to===item.id)||
             item.id===automatic?.control));
          const assignedControl=p.components.find(item=>item.id===automatic?.control);
          const assignedControlFields=assignedControl
            ?HPC_FREE.byType[assignedControl.type].fields.map(key=>
              sensorPicker(assignedControl,key,HPC_FREE.fieldLabel(key,lang))).join('')
            :'';
          specialized+=`<label class="hpc-checkbox"><input type="checkbox" data-hc-mixer="${esc(node.id)}"
            ${(node.options?.mixed!==false)?'checked':''}/><span>${t('Mischer vorhanden','Mixing valve installed')}</span></label>
            <label>${t('Heizflächenart','Heat emitter')}<select data-heating-emitter="${esc(node.id)}">
              ${[['underfloor',t('Fußbodenheizung','Underfloor heating')],['radiator',t('Plattenheizkörper','Panel radiators')],['column',t('Gliederheizkörper','Column radiators')]]
                .map(([id,label])=>`<option value="${id}" ${(node.options?.emitter||'radiator')===id?'selected':''}>${label}</option>`).join('')}
            </select></label>
            <section class="hpc-inline-section" data-heating-connection><strong>${t('Hydraulischer Anschluss','Hydraulic connection')}</strong>
              <p>${complete?t('Vorlauf und Rücklauf vorhanden.','Supply and return connected.'):
                feed?t('Vorlauf vorhanden; Rücklauf fehlt.','Supply connected; return missing.'):
                back?t('Rücklauf vorhanden; Vorlauf fehlt.','Return connected; supply missing.'):
                t('Heizkreis noch nicht angeschlossen.','Heating circuit is not connected yet.')}</p>
              <div class="hpc-row"><label>${t('Versorgung über','Supplied by')}<select data-hc-source="${esc(node.id)}">
                <option value="">${t('Auswählen','Choose')}</option>${heatingSources.map(source=>
                  `<option value="${esc(source.id)}" ${source.id===sourceId?'selected':''}>${esc(source.name)} · ${esc(HPC_FREE.display(source.type,lang))}</option>`).join('')}
              </select></label><label>${t('Anschlussart','Connection type')}<select data-hc-kind="${esc(node.id)}">
                ${[['direct',t('Direkt','Direct')],['pump',t('Über vorhandene Pumpe','Via existing pump')],['mixer',t('Über vorhandenen Mischer','Via existing mixer')],['custom',t('Manuell','Manual')]]
                  .map(([value,label])=>`<option value="${value}" ${automatic?.kind===value?'selected':''}>${label}</option>`).join('')}
              </select></label></div>
              <label data-hc-control-wrap ${['pump','mixer'].includes(automatic?.kind)?'':'hidden'}>${t('Vorhandene Pumpe / Mischer','Existing pump / mixer')}
                <select data-hc-control="${esc(node.id)}"><option value="">${t('Auswählen','Choose')}</option>
                  ${controls.map(control=>`<option value="${esc(control.id)}" ${control.id===automatic?.control?'selected':''}>${esc(control.name)}</option>`).join('')}
                </select></label>
              ${assignedControl?`<details data-panel="hc-control:${esc(node.id)}"><summary>${t('Pumpen-/Mischer-Einstellungen','Pump/mixer settings')} · ${esc(assignedControl.name)}</summary>
                <div class="hpc-component-sensors">${assignedControlFields}</div></details>`:''}
              <div class="hpc-actions"><button type="button" class="hpc-primary" data-action="hc-connect" data-component="${esc(node.id)}">
                ${complete?t('Verbindung ändern','Change connection'):t('Vorlauf und Rücklauf verbinden','Connect supply and return')}</button></div>
              <label>${t('Verbindungsmodus','Connection mode')}<select data-hc-mode="${esc(node.id)}">
                <option value="automatic">${t('Automatisch','Automatic')}</option><option value="manual">${t('Manuell','Manual')}</option>
              </select></label>
            </section>`;
        }
        if(node.type==='dhw_tank'){
          const status=dhwRouteFor(node);
          const sources=p.components.filter(item=>item.type==='buffer'||
            HPC_FREE.byType[item.type]?.group==='source');
          const availableBuffers=p.components.filter(item=>item.type==='buffer');
          const chargingSource= status.source?.id||
            sources.find(item=>item.id===p.connections.find(edge=>edge.to===node.id&&edge.to_port==='coil_in')?.from)?.id||'';
          const hasCoilConnection=p.connections.some(edge=>
            edge.to===node.id&&edge.to_port==='coil_in'||edge.from===node.id&&edge.from_port==='coil_out');
          const kind=node.options?.dhw_charge?.kind||'pump';
          const routeControlIds=[...(Array.isArray(status.flow)?status.flow:[]),
            ...(Array.isArray(status.back)?status.back:[])].flatMap(edgeId=>{
              const edge=p.connections.find(item=>item.id===edgeId);
              return [edge?.from,edge?.to].filter(id=>
                ['pump','diverter'].includes(p.components.find(item=>item.id===id)?.type));
            });
          const chargeControlId=node.options?.dhw_charge?.control||
            routeControlIds[0]||'';
          const chargeControl=p.components.find(item=>item.id===chargeControlId);
          const chargeControls=p.components.filter(item=>
            item.type===(kind==='diverter'?'diverter':'pump')&&
            (!p.connections.some(edge=>edge.from===item.id||edge.to===item.id)||
             item.id===chargeControlId));
          const managedControlFields=chargeControl
            ?HPC_FREE.byType[chargeControl.type].fields.map(key=>
              sensorPicker(chargeControl,key,HPC_FREE.fieldLabel(key,lang))).join('')
            :'';
          const diverterSettings=chargeControl?.type==='diverter'?`
            <label>${t('Warmwasser-Ausgang','DHW outlet')}<select data-diverter-port="${esc(chargeControl.id)}">
              <option value="a" ${chargeControl.options?.dhw_port!=='b'?'selected':''}>A</option>
              <option value="b" ${chargeControl.options?.dhw_port==='b'?'selected':''}>B</option>
            </select></label>
            <label>${t('Ventilwert für Warmwasser','Valve value for DHW')}<input data-diverter-dhw="${esc(chargeControl.id)}"
              value="${esc(chargeControl.options?.dhw_state||'')}"/></label>
            <label>${t('Ventilwert für Heizen','Valve value for heating')}<input data-diverter-heating="${esc(chargeControl.id)}"
              value="${esc(chargeControl.options?.heating_state||'')}"/></label>`:'';
          specialized+=`<details data-panel="dhw-setup:${esc(node.id)}" open><summary>${t('Warmwasserbereitung','Hot-water charging')}</summary>
            <p class="${status.complete?'':'hpc-connection-warning'}">${status.complete
              ?`${t('Warmwasserbereitung angeschlossen','Hot-water charging connected')}: ${esc(status.source.name)} · ${t('Vorlauf und Rücklauf vorhanden','Supply and return connected')}`
              :status.flow?t('Vorlauf vorhanden, Rücklauf fehlt.','Supply connected, return missing.'):
                status.back?t('Rücklauf vorhanden, Vorlauf fehlt.','Return connected, supply missing.'):
                hasCoilConnection?t('Warmwasserverbindung unvollständig; bitte die Einzelverbindungen prüfen.','DHW circuit is incomplete; review individual connections.'):
                t('Warmwasserspeicher noch nicht angeschlossen.','Hot-water tank is not connected yet.')}</p>
            <div class="hpc-row"><label>${t('Wärmequelle','Heat source')}<select data-dhw-source="${esc(node.id)}">
              ${sources.map(source=>`<option value="${esc(source.id)}" ${source.id===chargingSource?'selected':''}>${esc(source.name)}</option>`).join('')}
            </select></label><label>${t('Ladeart','Charging method')}<select data-dhw-kind="${esc(node.id)}">
              ${[['pump',t('Über Ladepumpe','Via charging pump')],['diverter',t('Über Umschaltventil','Via diverter valve')],['direct',t('Direkt angeschlossen','Direct')]]
                .map(([value,label])=>`<option value="${value}" ${kind===value?'selected':''}>${label}</option>`).join('')}
            </select></label></div>
            ${availableBuffers.length?`<label data-dhw-buffer-wrap ${kind==='diverter'?'':'hidden'}>${t('Heizung / Puffer laden','Heat / charge buffer')}
              <select data-dhw-buffer="${esc(node.id)}">
                <option value="">${t('Ohne Pufferumschaltung','Without buffer switching')}</option>
                ${availableBuffers.map(buffer=>`<option value="${esc(buffer.id)}">${esc(buffer.name)}</option>`).join('')}
              </select></label>`:''}
            <label>${t('Leitungsführung','Pipe routing')}<select data-dhw-style="${esc(node.id)}">
              <option value="branch" ${node.options?.connection_style==='branch'?'selected':''}>${t('Gemeinsamer Vorlauf und Rücklauf','Shared supply and return')}</option>
              <option value="separate" ${node.options?.connection_style!=='branch'?'selected':''}>${t('Eigener Ladekreis','Separate charging circuit')}</option>
            </select></label>
            <label data-dhw-control-wrap ${kind==='direct'?'hidden':''}>${kind==='diverter'?t('Vorhandenes Umschaltventil','Existing changeover valve'):t('Vorhandene Ladepumpe','Existing charging pump')}
              <select data-dhw-control="${esc(node.id)}"><option value="">${t('Automatisch neu anlegen','Create automatically')}</option>
                ${chargeControls.map(control=>`<option value="${esc(control.id)}" ${control.id===chargeControlId?'selected':''}>${esc(control.name)}</option>`).join('')}
              </select></label>
            ${chargeControl?`<details data-panel="charge-control:${esc(node.id)}"><summary>${t('Ladegerät-Einstellungen','Charging device settings')} · ${esc(chargeControl.name)}</summary>
              <div class="hpc-component-sensors">${managedControlFields}</div>${diverterSettings}</details>`:''}
            ${hasCoilConnection?`<p>${t('Bestehende Leitungen werden nicht automatisch ersetzt. Technische Änderungen findest du unter Erweiterte Einstellungen.','Existing pipes are not replaced automatically. Use Advanced settings for manual changes.')}</p>`:
              `<button type="button" class="hpc-primary" data-action="dhw-route" data-component="${esc(node.id)}">
                ${t('Warmwasserbereitung einrichten','Set up hot-water charging')}</button>`}
          </details>`;
        }
        const sourceLinks=group==='source'?HPC_FREE.connectionPairs(p).filter(pair=>
          pair.from===node.id&&p.components.find(item=>item.id===pair.to)?.type==='buffer'):[];
        const sourceConnection=sourceLinks.length?`<section class="hpc-inline-section"><strong>${t('Hydraulische Verbindung','Hydraulic connection')}</strong>
          <label>${t('Verbinden mit','Connect to')}<select data-source-pair="${esc(node.id)}">
            <option value="">${t('Verbindung wählen','Choose connection')}</option>
            ${sourceLinks.map(pair=>`<option value="${esc(pair.from+'|'+pair.to)}">${esc(pair.label)}</option>`).join('')}
          </select></label><button type="button" data-action="component-connect" data-component="${esc(node.id)}">
            ${t('Vorlauf und Rücklauf verbinden','Connect supply and return')}</button></section>`:'';
        const removeWarning=assigned.length
          ?t(`${assigned.length} Leitungen und zugeordnete Messwerte können betroffen sein.`,
              `${assigned.length} pipes and their assigned measurements may be affected.`):'';
        const assignedCount=fields.filter(key=>!!node.sensors?.[key]).length;
        return `<details class="hpc-component-card" data-panel="component:${esc(node.id)}" ${node.id===selected?.id?'open':''}>
          <summary>${HPC_FREE.icon(node.type)} <span><strong>${esc(node.name)}</strong>
            <small>${esc(HPC_FREE.display(node.type,lang))} · ${assignedCount} ${t('Messwerte','values')}</small></span></summary>
          <div class="hpc-component-body">
            <section class="hpc-component-group">
              <h4>${t('Gerät und Anschluss','Equipment and connections')}</h4>
              <div class="hpc-form-fields">${typeSelect}${nameInput}${specialized}${sourceConnection}</div>
            </section>
            ${appearance?`<section class="hpc-component-group">
              <h4>${t('Darstellung','Appearance')}</h4>
              <div class="hpc-form-fields">${appearance}</div>
            </section>`:''}
            <section class="hpc-component-group">
              <h4>${t('Messwerte','Measurements')} <small>· ${t('alle optional','all optional')}</small></h4>
              <div class="hpc-component-sensors">${sensorInputs}</div>${moreInputs}
              ${levels}
            </section>
            <details class="hpc-component-actions" data-panel="component-management:${esc(node.id)}">
              <summary>${t('Weitere Aktionen','More actions')}</summary>
              <p class="hpc-connection-summary">${edgeSummary.length
                ?t('Verbindungen: ','Connections: ')+edgeSummary.join(' · ')
                :t('Noch keine hydraulische Verbindung.','No hydraulic connection yet.')}</p>
              <button type="button" data-action="remove-component" data-component="${esc(node.id)}">
                ${t('Komponente entfernen','Remove component')}</button>
              ${removeWarning?`<small>${esc(removeWarning)}</small>`:''}
            </details>
          </div></details>`;
      };
      const managedControls=new Set();
      for(const circuit of p.components.filter(node=>node.type==='heating_circuit')){
        if(circuit.options?.hydraulic_auto?.control)
          managedControls.add(circuit.options.hydraulic_auto.control);
      }
      for(const tank of p.components.filter(node=>node.type==='dhw_tank')){
        const route=dhwRouteFor(tank);
        for(const edgeId of [...(route.flow||[]),...(route.back||[])]){
          const edge=p.connections.find(item=>item.id===edgeId);
          for(const id of [edge?.from,edge?.to]){
            const control=p.components.find(item=>item.id===id);
            if(HPC_FREE.byType[control?.type]?.group==='control')managedControls.add(id);
          }
        }
        if(tank.options?.dhw_charge?.control)managedControls.add(tank.options.dhw_charge.control);
      }
      const visibleComponents=p.components.filter(node=>
        HPC_FREE.byType[node.type]?.group!=='control'||!managedControls.has(node.id));
      const groups=[
        ['source',t('Wärmeerzeuger','Heat sources')],
        ['storage',t('Speicher und Warmwasser','Storage and hot water')],
        ['load',t('Heizkreise','Heating circuits')],
        ['control',t('Weitere Bauteile','Other components')]
      ];
      // Group by purpose, like the native editor. This does not change the
      // saved graph, the component IDs or existing measurement assignments.
      const componentSections=groups.map(([group,label])=>{
        const nodes=visibleComponents.filter(node=>HPC_FREE.byType[node.type]?.group===group);
        if(!nodes.length)return '';
        return `<section class="hpc-component-section" aria-label="${esc(label)}">
          <h3>${esc(label)} <small>${nodes.length}</small></h3>
          ${nodes.map(componentCard).join('')}
        </section>`;
      }).join('');
      const graphOverview=p.components.map(node=>{
        const edges=p.connections.filter(edge=>edge.from===node.id||edge.to===node.id);
        const otherNames=[...new Set(edges.map(edge=>{
          const other=p.components.find(item=>item.id===
            (edge.from===node.id?edge.to:edge.from));
          return other?.name;
        }).filter(Boolean))];
        let status='';
        if(node.type==='heating_circuit'){
          const supply=edges.some(edge=>edge.to===node.id&&edge.to_port==='flow_in');
          const back=edges.some(edge=>edge.from===node.id&&edge.from_port==='return_out');
          status=supply&&back?t('Vorlauf und Rücklauf vorhanden','Supply and return connected'):
            supply?t('Vorlauf vorhanden, Rücklauf fehlt','Supply connected, return missing'):
            back?t('Rücklauf vorhanden, Vorlauf fehlt','Return connected, supply missing'):
            t('Nicht angeschlossen','Not connected');
        }else if(node.type==='dhw_tank'){
          const route=dhwRouteFor(node);
          status=route.complete?t('Vorlauf und Rücklauf vorhanden','Supply and return connected'):
            route.flow?t('Vorlauf vorhanden, Rücklauf fehlt','Supply connected, return missing'):
            route.back?t('Rücklauf vorhanden, Vorlauf fehlt','Return connected, supply missing'):
            t('Nicht angeschlossen','Not connected');
        }else status=edges.length?t(`${edges.length} graphbasierte Anschlüsse`,` ${edges.length} graph connections`):
          t('Nicht angeschlossen','Not connected');
        return `<div class="hpc-pipe-row"><strong>${esc(node.name)}</strong>
          <span>${esc(otherNames.length?otherNames.join(' · '):t('Keine verbundene Komponente','No connected component'))}
          <small>${esc(status)}</small></span></div>`;
      }).join('');
      const connectionField=(edge,field,label)=>useNativePicker
        ? `<ha-entity-picker data-edge="${esc(edge.id)}" data-edge-field="${field}" data-label="${esc(label)}"></ha-entity-picker>`
        : `<label>${esc(label)}<input list="hpc-free-entities" data-edge="${esc(edge.id)}" data-edge-field="${field}" value="${esc(edge[field])}"/></label>`;
      // Selecting two components is easier than choosing four separate ports.
      // A heat-source/tank pair creates its hot supply and matching return.
      const dhwTanks=p.components.filter(c=>c.type==='dhw_tank');
      const dhwSources=p.components.filter(c=>c.type==='buffer'||HPC_FREE.byType[c.type]?.group==='source');
      const dhwOptions=dhwTanks.filter(c=>!p.connections.some(e=>
        e.to===c.id&&e.to_port==='coil_in'||e.from===c.id&&e.from_port==='coil_out'));
      const suggestedPairs=HPC_FREE.connectionPairs(p);
      const pairOptions=suggestedPairs.map(c=>
        '<option value="'+esc(c.from+'|'+c.to)+'">'+esc(c.label)+' · '+
        (c.count>1?t('Vorlauf + Rücklauf','Flow + return'):
          t('Fehlende Leitung ergänzen','Add missing pipe'))+'</option>').join('');
      const connectionRows=p.connections.map(edge=>{
        const from=p.components.find(c=>c.id===edge.from);
        const to=p.components.find(c=>c.id===edge.to);
        const supply=['flow','dhw','top_out','mid_out','coil_in','flow_in','top_in'].includes(edge.from_port)||
          ['coil_in','flow_in','top_in'].includes(edge.to_port);
        const direction=supply?t('Vorlauf','Supply'):t('Rücklauf','Return');
        return '<div class="hpc-pipe-row">'
          +'<span>'+esc((from?.name||edge.from)+' → '+(to?.name||edge.to))
          +'<small>'+direction+' · '+esc(portNames[edge.from_port]||edge.from_port)
            +' → '+esc(portNames[edge.to_port]||edge.to_port)+'</small></span>'
          +'<button type="button" data-action="remove-edge" data-edge-id="'+esc(edge.id)+'">'
            +t('Entfernen','Remove')+'</button>'
          +'<details><summary>'+t('Messwerte für diese Leitung (optional)','Values for this pipe (optional)')
            +'</summary><div class="hpc-row">'
            +connectionField(edge,'flow_entity',t('Pumpen-/Flussstatus','Pump or flow state'))
            +connectionField(edge,'temperature_entity',t('Rohrtemperatur','Pipe temperature'))
            +'</div></details></div>';
      }).join("");
      const counts=type=>p.components.filter(node=>type==='source'
        ?HPC_FREE.byType[node.type]?.group==='source':node.type===type).length;
      const countRow=(type,label)=>`<div class="hpc-count-row"><label>${esc(label)}
        <input type="number" min="0" max="${type==='heating_circuit'?6:20}" value="${counts(type)}"
          data-target-count="${type}" aria-label="${esc(label)}"/></label>
        <button type="button" data-action="apply-count" data-count-type="${type}">
          ${t('Anzahl übernehmen','Apply count')}</button></div>`;
      const legacyResolved=this._hass
        ?HeatpumpFlowCard._resolve(this._config,this._hass):{fromPreset:{}};
      const legacyShown={...(legacyResolved.fromPreset||{})};
      for(const [key,value] of Object.entries(this._config.entities||{})){
        if(value===null||value==='none')delete legacyShown[key];
        else if(value)legacyShown[key]=value;
      }
      const legacyFits=Object.fromEntries(Object.keys(HFC_KINDS).map(kind=>[
        kind,Object.entries(this._hass?.states||{}).filter(([id,state])=>
          HeatpumpFlowCard._fit(kind,id,state).verdict==='ok').map(([id])=>id)
      ]));
      const legacyForm=HeatpumpFlowCard._formSchema(this._config,null,{
        fits:legacyFits,all:this._allEntities===true,shown:legacyShown
      });
      const legacySchema=legacyForm.schema.filter(field=>
        field.name==='preset'||field.name==='entities'||field.name==='advanced');
      const html=`<style>${HPC_FREE.css}
        .hpc-category,.hpc-component-card{border:1px solid var(--divider-color,rgba(127,127,127,.25));margin:0;padding:0;background:var(--card-background-color,transparent)}
        .hpc-component-section{margin:14px 0 20px}
        .hpc-component-section>h3{display:flex;align-items:center;gap:8px;margin:0 0 9px;font-size:1.05rem;font-weight:600}
        .hpc-component-section>h3 small,.hpc-component-card summary small{font-size:.78rem;color:var(--secondary-text-color);font-weight:400}
        .hpc-component-card>summary{display:flex;align-items:center;gap:10px}
        .hpc-component-card>summary span{min-width:0;display:flex;flex-direction:column;gap:3px}
        .hpc-component-card>summary .hpc-pictogram{width:30px;height:30px;flex-shrink:0}
        .hpc-component-group{padding:12px 0;border-bottom:1px solid var(--divider-color,rgba(127,127,127,.2))}
        .hpc-component-group h4{margin:0 0 12px;font-size:.94rem;font-weight:600}
        .hpc-component-group h4 small{font-weight:400;color:var(--secondary-text-color)}
        .hpc-form-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px}
        .hpc-form-fields>section,.hpc-form-fields>details,.hpc-form-fields>.hpc-row{grid-column:1/-1}
        .hpc-component-actions{margin-top:12px}
        .hpc-setup-hint{color:var(--secondary-text-color);line-height:1.45;margin:14px 0}
        .hpc-editor .hpc-component-card>summary:before{order:2;margin-left:auto;flex-shrink:0}
        .hpc-category:first-of-type,.hpc-component-card:first-of-type{border-radius:8px 8px 0 0}
        .hpc-category:last-of-type,.hpc-component-card:last-of-type{border-radius:0 0 8px 8px}
        .hpc-category+details,.hpc-component-card+details{border-top:0}
        .hpc-editor .hpc-category>summary,.hpc-editor .hpc-component-card>summary{cursor:pointer;padding:14px 16px;font-weight:500;list-style:none}
        .hpc-category>summary::-webkit-details-marker,.hpc-component-card>summary::-webkit-details-marker{display:none}
        .hpc-category>summary:before,.hpc-component-card>summary:before{content:'›';display:inline-block;width:20px;color:var(--secondary-text-color);font-size:1.2em}
        .hpc-category[open]>summary:before,.hpc-component-card[open]>summary:before{transform:rotate(90deg)}
        .hpc-category-body,.hpc-component-body{padding:0 16px 14px}
        .hpc-component-body>*{margin-top:10px}
        .hpc-count-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--divider-color)}
        .hpc-count-row label{flex:1}
        .hpc-component-sensors{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}
        .hpc-graph-summary{display:grid;gap:6px}
        .hpc-inline-section{border-top:1px solid var(--divider-color);margin:12px 0;padding-top:8px}
      </style><div class="hpc-editor">
        <label class="hpc-checkbox">
          <input type="checkbox" data-all-entities ${this._allEntities===true?'checked':''}/>
          <span>${t("Alle Entitäten in der Auswahl zeigen","Show all entities in selectors")}</span>
        </label>
        ${this._discoveryWarnings?.map(warning=>
          `<p class="hpc-connection-warning" role="status">${esc(warning)}</p>`).join('')||''}
        ${!configured?`<h3>${t("Allgemein · Komponentenanzahl","General · component counts")}</h3>
          <p>${t("Lege die Anzahl fest. Typ und Sensoren ordnest du danach jedem Bauteil einzeln zu.","Choose the counts first. Then set the type and sensors for each component individually.")}</p>
          ${emsInfo}
          ${emsCircuitInfo}
          ${emsDhwInfo}
          ${etaInfo}
          ${etaPartInfo}
          ${chosenEta||chosenEtaPart?`<div class="hpc-actions"><button type="button" class="hpc-primary" data-action="eta-scan-all">${t("ETA-Anlage automatisch erkennen","Detect ETA system automatically")}</button></div>`:""}
          <div class="hpc-setup-group">${setupGroups}</div>
          <div class="hpc-row" data-setup-buffer-mode hidden><label>${t("Mehrere Pufferspeicher verbinden","Connect multiple buffer tanks")}
            <select data-setup-buffer-topology>
              <option value="series">${t("In Reihe","In series")}</option>
              <option value="parallel">${t("Parallel","In parallel")}</option>
            </select></label>
          </div>
          <div class="hpc-actions"><button type="button" class="hpc-primary" data-action="setup-create" disabled>${t("Hydraulikplan erstellen","Create hydraulic plan")}</button>
            <button type="button" data-action="example">${t("Beispiel: Elternanlage","Example: parents' system")}</button></div>`:`
          <details class="hpc-category" data-panel="general" open>
            <summary><strong>${t('Allgemein','General')}</strong></summary>
            <div class="hpc-category-body">
          ${useNativeForm?'<ha-form id="hpc-native-settings"></ha-form>':
             `<div class="hpc-row"><label>${t("Name der Anlage","System name")}<input id="hpc-free-title"
             value="${esc(this._config.title||"")}" placeholder="Hydraulic Plan Card"/></label></div>`}
          <div class="hpc-actions"><button type="button" data-action="example">${t("Beispielanlage laden (ersetzt Plan)","Load example (replaces plan)")}</button></div>
          <details class="hpc-advanced-pipes" ${this._config.hpc_migration_review||this._migrationWarnings?.length?'open':''}>
            <summary>${t("Migration & Konfiguration","Migration & configuration")} · v${esc(this._config.hpc_schema_version||1)}</summary>
            <p>${t("Die ursprüngliche Konfiguration bleibt bei der ersten Migration als Sicherung erhalten. Vorhandene Sensoren und bestätigte Leitungen werden nicht neu geraten.","The original configuration is backed up on first migration. Sensor mappings and confirmed connections are not guessed.")}</p>
            ${migrationNotes.map(note=>`<p class="hpc-connection-warning">${esc(note)}</p>`).join('')}
            ${this._config.hpc_migration_backup?`<div class="hpc-actions">
              <button type="button" data-action="migration-restore">${t("Vorherige Konfiguration wiederherstellen","Restore previous configuration")}</button>
              ${this._config.hpc_migration_review?`<button type="button" data-action="migration-ack">${t("Hydraulik geprüft","Hydraulics reviewed")}</button>`:""}
            </div>`:""}
          </details>
          ${emsInfo}
          ${emsCircuitInfo}
          ${emsDhwInfo}
          ${etaInfo}
          ${etaPartInfo}
          ${chosenEta||chosenEtaPart?`<div class="hpc-actions"><button type="button" class="hpc-primary" data-action="eta-scan-all">${t("ETA-Anlage automatisch erkennen","Detect ETA system automatically")}</button></div>`:""}
            ${countRow('source',t('Wärmeerzeuger','Heat sources'))}
            ${countRow('buffer',t('Pufferspeicher','Buffer tanks'))}
            ${countRow('dhw_tank',t('Warmwasserspeicher','Hot-water tanks'))}
            ${countRow('heating_circuit',t('Heizkreise','Heating circuits'))}
            <div class="hpc-row"><label>${t('Weitere Komponente hinzufügen','Add another component')}
              <select data-add-type>${HPC_FREE.types.filter(item=>item.group==='control').map(item=>
                `<option value="${esc(item.type)}">${esc(HPC_FREE.display(item.type,lang))}</option>`).join('')}
              </select></label><button type="button" data-action="add-category" data-category="other">
                ${t('Hinzufügen','Add')}</button></div>
            </div>
          </details>
          <p class="hpc-setup-hint">${t("Gerät, Messwerte und Darstellung findest du direkt beim jeweiligen Bauteil. Nicht benötigte Datenpunkte bleiben frei.","Device, measurements and appearance are grouped with each component. Unneeded measurements can stay empty.")}</p>
          ${componentSections}
          <details class="hpc-category" data-panel="advanced">
            <summary><strong>${t('Erweiterte Einstellungen','Advanced settings')}</strong></summary>
            <div class="hpc-category-body">
            <h3>${t('Hydraulische Verbindungen','Hydraulic connections')}</h3>
            <div class="hpc-graph-summary">${graphOverview||`<p>${t('Noch keine Komponenten im Hydraulikplan.','No components in the hydraulic plan yet.')}</p>`}</div>
            <details data-panel="buffer-topology">
              <summary>${t('Pufferspeicher hydraulisch verbinden','Connect buffer tanks')}</summary>
              ${bufferList.length>=2?`<p>${t("Reihenschaltung: Vorlauf oben zum nächsten Puffer, Rücklauf unten zurück. Bestehende Leitungen bleiben erhalten.","Series: supply at the top to the next buffer, return at the bottom to the previous. Existing pipes are preserved.")}</p>
                <div class="hpc-row"><button type="button" data-action="buffer-series">${t("Puffer in Reihe verbinden","Connect buffers in series")}</button>
                <label>${t("Wärmeerzeuger für parallele Puffer","Heat source for parallel buffers")}<select id="hpc-buffer-source">
                  ${p.components.filter(c=>HPC_FREE.byType[c.type]?.group==='source').map(c=>
                    `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
                </select></label><button type="button" data-action="buffer-parallel"
                  ${p.components.some(c=>HPC_FREE.byType[c.type]?.group==='source')?'':'disabled'}>
                  ${t("Puffer parallel verbinden","Connect buffers in parallel")}</button></div>
                <p id="hpc-buffer-notice" role="alert" class="hpc-connection-warning"></p>`:
                `<p>${t('Für eine Reihen- oder Parallelschaltung werden mindestens zwei Pufferspeicher benötigt.','At least two buffer tanks are needed for series or parallel connections.')}</p>`}
              ${misplacedBufferEdges.length?`<p class="hpc-connection-warning">${t("Achtung: Eine Pufferleitung ist von unten nach oben verbunden. Bitte prüfen, ob das der tatsächlichen Verrohrung entspricht.","Warning: a buffer pipe links bottom to top. Verify this corresponds to the actual installation.")}</p>`:''}
            </details>
            <details class="hpc-advanced-pipes" data-panel="individual-connections">
              <summary>${t("Hydraulische Einzelverbindungen","Individual hydraulic connections")}</summary>
              <p>${t("Nur hier Leitungen einzeln ergänzen oder entfernen und leitungsbezogene Messwerte zuordnen. Manuelle Verbindungen werden nicht automatisch ersetzt.","Add or remove individual pipes and assign pipe measurements here. Manual connections are never replaced automatically.")}</p>
              <div class="hpc-row"><label>${t("Ausgang","From port")}<select id="hpc-from">
                <option value="">–</option>${portOptions("from")}</select></label>
                <label>${t("Eingang","To port")}<select id="hpc-to"><option value="">–</option></select></label>
                <button type="button" data-action="connect">${t("Einzelne Leitung hinzufügen","Add individual pipe")}</button>
              </div>
              <h4>${t("Vorhandene Einzelverbindungen","Existing individual connections")}</h4>
              ${connectionRows||`<p>${t("Noch keine bestätigten Rohrverbindungen. Der Plan erfindet keine Leitungen.","No confirmed pipes yet. The plan does not invent pipework.")}</p>`}
            </details>
            <details data-panel="migration">
              <summary>${t("Migration und Sicherung","Migration and backup")} · v${esc(this._config.hpc_schema_version||1)}</summary>
              <p>${t("Die ursprüngliche Konfiguration bleibt bei der ersten Migration als Sicherung erhalten.","The original configuration is preserved on first migration.")}</p>
              ${migrationNotes.map(note=>`<p class="hpc-connection-warning">${esc(note)}</p>`).join('')}
              ${this._config.hpc_migration_backup?`<button type="button" data-action="migration-restore">
                ${t("Vorherige Konfiguration wiederherstellen","Restore previous configuration")}</button>
                ${this._config.hpc_migration_review?`<button type="button" data-action="migration-ack">${t("Hydraulik geprüft","Hydraulics reviewed")}</button>`:''}`:''}
            </details>
            <details data-panel="original-options">
              <summary>${t('Originale Wärmepumpen- und Detailoptionen','Original heat-pump and detail options')}</summary>
              <p>${t('Die originale Geräte-, Betriebs- und Kältekreis-Konfiguration bleibt hier verfügbar.','The original appliance, operation and refrigerant settings remain available here.')}</p>
              <ha-form id="hpc-native-legacy"></ha-form>
            </details>
            </div>
          </details>
          ${emsInfo}${emsCircuitInfo}${emsDhwInfo}${etaInfo}${etaPartInfo}
          ${chosenEta||chosenEtaPart?`<button type="button" class="hpc-primary" data-action="eta-scan-all">
            ${t("ETA-Anlage automatisch erkennen","Detect ETA system automatically")}</button>`:''}
          <p>${t("Die Leitungen werden nur bei bestätigtem Pumpen- oder Flusssignal animiert. Die Vorschau bleibt Teil des ursprünglichen Hydraulikplans.","Pipes animate only with confirmed pump or flow signals. The preview remains part of the original hydraulic schematic.")}</p>
          <p>${t("Die Vorschau verwendet weiterhin den originalen Hydraulikplan und dessen Heizkreisgrafiken.","The preview continues to use the original hydraulic schematic and its heating-circuit artwork.")}</p>`}
        ${dataList}
      </div>`;
      if(!this._freeUi){this._freeUi=document.createElement("div");this.append(this._freeUi);}
      // Rebuilds retain the open accordion path, scroll position and focused field.
      const oldY=this._freeUi.scrollTop;
      const openPanels=new Map([...this._freeUi.querySelectorAll('details[data-panel]')]
        .map(panel=>[panel.dataset.panel,panel.open]));
      const activeElement=this.shadowRoot?.activeElement||this.ownerDocument.activeElement;
      const active=this._freeUi.contains(activeElement)?activeElement:null;
      const focusKey=active?.dataset?.focusKey||'';
      const selection=active&&typeof active.selectionStart==='number'
        ?[active.selectionStart,active.selectionEnd]:null;
      this._freeUi.innerHTML=html;
      for(const panel of this._freeUi.querySelectorAll('details[data-panel]')){
        if(openPanels.has(panel.dataset.panel))panel.open=openPanels.get(panel.dataset.panel);
      }
      this._freeUi.scrollTop=oldY;
      if(focusKey){
        const focusTarget=[...this._freeUi.querySelectorAll('[data-focus-key]')]
          .find(element=>element.dataset.focusKey===focusKey);
        focusTarget?.focus({preventScroll:true});
        if(selection&&typeof focusTarget?.setSelectionRange==='function')
          focusTarget.setSelectionRange(...selection);
      }
      const root=this._freeUi;
      // Always edit the latest plan, not the snapshot used to render this form.
      // Multiple sensor selections can otherwise overwrite each other when
      // the form intentionally stays mounted between changes.
      const changePlan=(fn,options={})=>{
        const next=HPC_FREE.normalize(this._config.plan);
        fn(next);
        this._applyPlan(next,{},options);
      };
      const settingsForm=root.querySelector('#hpc-native-settings');
      if(settingsForm){
        const choice=(name,options)=>({name,selector:{select:{mode:'dropdown',
          options:options.map(([value,label])=>({value,label}))}}});
        const settingsFields=[
          {name:'title',selector:{text:{}}},
          choice('layout',[['default',t('Standard','Default')],['compact',t('Kompakt','Compact')],
            ['wide',t('Breit','Wide')],['wall',t('Wanddisplay','Wall display')]]),
          choice('theme',[['auto',t('Automatisch','Automatic')],['night',t('Nacht','Night')],
            ['contrast',t('Kontrast','Contrast')]]),
          choice('animations',[['auto',t('Automatisch','Automatic')],['always',t('Immer','Always')],
            ['off',t('Aus','Off')]]),
          {name:'fullscreen',selector:{boolean:{}}},
          {name:'diagnostic',selector:{boolean:{}}},
          {name:'controls',selector:{entity:{multiple:true,domain:['switch','input_boolean','light',
            'fan','automation','button','input_button','script','scene','climate','number','input_number',
            'select','input_select','water_heater']}}},
        ];
        settingsForm.hass=this._hass;
        settingsForm.schema=[{type:'expandable',name:'appearance',flatten:true,
          title:t('Darstellung und Bedienung','Appearance and controls'),schema:settingsFields}];
        settingsForm.computeLabel=entry=>({
          title:t('Name der Anlage','System name'),layout:t('Layout','Layout'),
          theme:t('Farbschema','Theme'),animations:t('Animationen','Animations'),
          fullscreen:t('Vollbildansicht','Fullscreen'),diagnostic:t('Diagnosebericht','Diagnostic report'),
          controls:t('Schnellbedienung','Quick controls')})[entry.name]||entry.name;
        settingsForm.data={title:this._config.title||'',layout:this._config.layout||'default',
          theme:this._config.theme||'auto',animations:this._config.animations||'auto',
          fullscreen:this._config.fullscreen!==false,diagnostic:this._config.diagnostic!==false,
          controls:this._config.controls||[]};
        settingsForm.addEventListener('value-changed',event=>{
          event.stopPropagation();
          const values=event.detail?.value;
          if(!values)return;
          const changed={};
          for(const key of ['title','layout','theme','animations','fullscreen','diagnostic','controls']){
            if(Object.hasOwn(values,key))changed[key]=values[key];
          }
          // Keep the appearance section and its current focus open, too.
          if(Object.keys(changed).length)this._save({...this._config,...changed},{repaint:false});
        });
      }
      const legacySettingsForm=root.querySelector('#hpc-native-legacy');
      if(legacySettingsForm){
        legacySettingsForm.hass=this._hass;
        legacySettingsForm.schema=legacySchema;
        legacySettingsForm.computeLabel=legacyForm.computeLabel;
        legacySettingsForm.data={...this._config,entities:legacyShown};
        legacySettingsForm.addEventListener('value-changed',event=>{
          event.stopPropagation();
          const values=event.detail?.value;
          if(!values)return;
          const next={...this._config};
          for(const [key,value] of Object.entries(values)){
            if(['entities','all_entities','plan'].includes(key)||key.startsWith('hpc_'))continue;
            next[key]=value;
          }
          if(values.entities&&typeof values.entities==='object')
            next.entities={...(this._config.entities||{}),...values.entities};
          this._save(next,{repaint:false});
        });
      }
      const chosenForm=root.querySelector('#hpc-native-sensors');
      this._nativeSensorForm=chosenForm||null;
      if(chosenForm&&selected){
        // No domain or device-class restriction: every data point is optional.
        const entityField=key=>({name:key,required:false,selector:{entity:{}}});
        chosenForm.hass=this._hass;
        chosenForm.schema=[{type:'expandable',name:'sensors',title:t('Sensoren und Messwerte','Sensors and measurements'),
          expanded:true,
          schema:[...coreFields.map(entityField),
            ...(moreFields.length?[{type:'expandable',name:'more',flatten:true,
              title:t('Weitere Felder','More fields'),expanded:moreFields.some(key=>!!selected.sensors[key]),
              schema:moreFields.map(entityField)}]:[])]}];
        chosenForm.computeLabel=entry=>HPC_FREE.fieldLabel(entry.name,lang);
        chosenForm.computeHelper=()=>t('Wähle eine vorhandene Home-Assistant-Entität aus.','Choose an existing Home Assistant entity.');
        chosenForm.data={sensors:{...selected.sensors}};
        chosenForm.addEventListener('value-changed',event=>{
          event.stopPropagation();
          const values=event.detail?.value?.sensors;
          if(!values||typeof values!=='object')return;
          changePlan(next=>{
            const node=next.components.find(c=>c.id===selected.id);
            if(!node)return;
            for(const key of activeFields){
              // ha-form may emit partial values. Missing keys are not a
              // request to clear another already assigned sensor.
              if(!Object.hasOwn(values,key))continue;
              if(values[key])node.sensors[key]=values[key];
              else delete node.sensors[key];
            }
          },{repaint:false});
        });
      }
      const typePicker=root.querySelector('#hpc-free-type');
      typePicker?.addEventListener('change',()=>{
        const box=root.querySelector('#hpc-free-icon');
        if(box)box.innerHTML=HPC_FREE.icon(typePicker.value);
      });
      root.querySelector('[data-all-entities]')?.addEventListener('change',event=>{
        this._allEntities=event.currentTarget.checked;
        this._renderFlex();
      });
      const setupCount=type=>Math.max(0,Math.round(Number(
        root.querySelector(`[data-setup-count="${CSS.escape(type)}"]`)?.value)||0));
      const setupSelectionChanged=()=>{
        const sourceCount=setupCount('source');
        const holder=root.querySelector('[data-setup-source-types]');
        if(holder){
          const previous=[...holder.querySelectorAll('select')].map(select=>select.value);
          holder.innerHTML=Array.from({length:sourceCount},(_,index)=>
            `<div class="hpc-count-row"><label>${t('Wärmeerzeuger','Heat source')} ${index+1}</label>
              <select data-setup-source-type>${sourceTypeOptions}</select></div>`).join('');
          holder.querySelectorAll('select').forEach((select,index)=>{
            if(previous[index])select.value=previous[index];
          });
        }
        const selectedCount=sourceCount+setupCount('buffer')+setupCount('dhw_tank')+
          setupCount('heating_circuit');
        const create=root.querySelector('[data-action="setup-create"]');
        if(create)create.disabled=selectedCount===0;
        const bufferMode=root.querySelector('[data-setup-buffer-mode]');
        if(bufferMode)bufferMode.hidden=setupCount('buffer')<2;
      };
      root.querySelectorAll('[data-setup-count]').forEach(input=>
        input.addEventListener('change',setupSelectionChanged));
      setupSelectionChanged();
      root.querySelectorAll('ha-entity-picker[data-sensor]').forEach(picker=>{
        const node=p.components.find(item=>item.id===picker.dataset.sensor);
        picker.hass=this._hass;
        picker.label=picker.dataset.label;
        picker.value=node?.sensors?.[picker.dataset.field]||'';
        picker.allowCustomEntity=true;
        // Do not hide valid entities based on heuristic state/device-class matching.
        // Different integrations report the same role through different domains.
        // Native picker stays searchable and accepts any existing entity.
        picker.addEventListener('value-changed',event=>{
          event.stopPropagation();
          const value=event.detail?.value||'';
          changePlan(next=>{
            const target=next.components.find(item=>item.id===picker.dataset.sensor);
            if(!target)return;
            if(value)target.sensors[picker.dataset.field]=value;
            else delete target.sensors[picker.dataset.field];
          },{repaint:false});
        });
      });
      root.querySelectorAll('ha-entity-picker[data-level-entity]').forEach(picker=>{
        const node=p.components.find(item=>item.id===picker.dataset.levelEntity);
        picker.hass=this._hass;
        picker.label=picker.dataset.label;
        picker.value=node?.level_sensors?.[Number(picker.dataset.levelIndex)]?.entity||'';
        picker.allowCustomEntity=true;
        // Do not hide valid entities based on heuristic state/device-class matching.
        // Different integrations report the same role through different domains.
        // Native picker stays searchable and accepts any existing entity.
        picker.addEventListener('value-changed',event=>{
          event.stopPropagation();
          const value=event.detail?.value||'';
          changePlan(next=>{
            const point=next.components.find(item=>item.id===picker.dataset.levelEntity)
              ?.level_sensors?.[Number(picker.dataset.levelIndex)];
            if(point)point.entity=value;
          },{repaint:false});
        });
      });
      root.querySelectorAll('ha-entity-picker[data-edge]').forEach(picker=>{
        const edge=p.connections.find(c=>c.id===picker.dataset.edge);
        picker.hass=this._hass;
        picker.label=picker.dataset.label;
        picker.value=edge?.[picker.dataset.edgeField]||'';
        picker.allowCustomEntity=true;
        picker.addEventListener('value-changed',event=>{
          event.stopPropagation();
          changePlan(next=>{
            const row=next.connections.find(c=>c.id===picker.dataset.edge);
            if(row)row[picker.dataset.edgeField]=event.detail?.value||'';
          },{repaint:false});
        });
      });
      // Allow an uncertain boiler model to be selected before importing.
      const emsTypePicker=root.querySelector('#hpc-ems-type');
      emsTypePicker?.addEventListener('change',()=>{
        const apply=root.querySelector('[data-action="ems-apply"]');
        if(apply)apply.disabled=!emsTypePicker.value;
      });
      root.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",()=>{
        const action=button.dataset.action;
        if(action==="migration-restore"){
          const backup=HPC_MIGRATION.restore(this._config);
          if(!backup)return;
          if(!window.confirm(t(
            "Gespeicherte Konfiguration vor der Migration wiederherstellen? Spätere Änderungen gehen verloren.",
            "Restore the saved pre-migration configuration? Later edits will be lost.")))return;
          return this._save(backup);
        }
        if(action==="migration-ack"){
          return this._save({...this._config,hpc_migration_review:false});
        }
        if(action==="eta-scan-all"){
          if(!window.confirm(t(
            "Alle eindeutig erkannten ETA-Bauteile und Messwerte ergänzen? Bestehende Einstellungen und Rohrverbindungen bleiben unverändert.",
            "Add all clearly detected ETA components and values? Existing settings and pipes remain unchanged.")))return;
          const copy=HPC_FREE.normalize(p);
          let last=null,added=0;
          for(const c of etaCandidates){
            if(HPC_DISCOVERY.matchedNode(copy,c,'eta',etaCandidates))continue;
            const node=HPC_FREE.newNode('wood_chip_boiler',copy);
            if(!node)continue;
            node.name=c.name.slice(0,75);
            node.options={...node.options,eta_model:c.model,
              particle_separator:c.particleSeparator===true||
                ['particle_state','particle_voltage','particle_current'].some(k=>!!c.entities[k])};
            node.discovery={provider:'eta',id:String(c.id)};
            for(const [key,id] of Object.entries(c.entities))
              if(HPC_FREE.byType[node.type].fields.includes(key))node.sensors[key]=id;
            copy.components.push(node);
            last=node;added++;
          }
          for(const c of etaParts){
            if(copy.components.some(n=>
              n.discovery?.provider==='eta-system'&&n.discovery.id===c.id ||
              Object.values(n.sensors||{}).some(id=>Object.values(c.entities).includes(id))))continue;
            const node=HPC_FREE.newNode(c.type,copy);
            if(!node)continue;
            node.name=c.name.slice(0,75);
            node.discovery={provider:'eta-system',id:c.id};
            for(const [key,id] of Object.entries(c.entities))
              if(HPC_FREE.byType[node.type].fields.includes(key))node.sensors[key]=id;
            if(node.type==='heating_circuit'&&node.sensors.mixer)
              node.options={...node.options,mixed:true};
            copy.components.push(node);
            last=node;added++;
          }
          if(!added)return;
          if(last)this._selectedId=last.id;
          return this._applyPlan(copy,{hpc_legacy_imported:true});
        }
        if(action==="eta-part-apply"&&chosenEtaPart){
          const copy=HPC_FREE.normalize(p);
          const node=HPC_FREE.newNode(chosenEtaPart.type,copy);
          if(!node)return;
          node.name=chosenEtaPart.name;
          node.discovery={provider:'eta-system',id:String(chosenEtaPart.id)};
          for(const [key,id] of Object.entries(chosenEtaPart.entities)){
            if(HPC_FREE.byType[node.type].fields.includes(key))node.sensors[key]=id;
          }
          if(node.type==='heating_circuit'&&node.sensors.mixer)
            node.options={...node.options,mixed:true};
          copy.components.push(node);
          this._selectedId=node.id;
          return this._applyPlan(copy,{hpc_legacy_imported:true});
        }
        if(action==="eta-apply"&&chosenEta){
          // Reuse the exact detected device. Never merge an ETA installation
          // into an unrelated wood-chip boiler or overwrite manual choices.
          const detectedIds=new Set(Object.values(chosenEta.entities));
          const existing=p.components.filter(c=>c.type==='wood_chip_boiler');
          const target=existing.find(c=>Object.values(c.sensors||{}).some(id=>detectedIds.has(id)))||
            existing.find(c=>c.name===chosenEta.name&&c.options?.eta_model===chosenEta.model);
          const copy=HPC_FREE.normalize(p);
          const node=target?copy.components.find(c=>c.id===target.id):
            HPC_FREE.newNode('wood_chip_boiler',copy);
          if(!node)return;
          if(!target){
            node.name=chosenEta.name.slice(0,75);
            copy.components.push(node);
          }
          node.options={...node.options,eta_model:target?.options?.eta_model||chosenEta.model,
            particle_separator:node.options?.particle_separator===true||chosenEta.particleSeparator===true||
              ['particle_state','particle_voltage','particle_current'].some(k=>!!chosenEta.entities[k])};
          node.discovery={provider:'eta',id:String(chosenEta.id)};
          for(const [key,id] of Object.entries(chosenEta.entities)){
            if(HPC_FREE.byType[node.type].fields.includes(key)&&!node.sensors[key])
              node.sensors[key]=id;
          }
          this._selectedId=node.id;
          return this._applyPlan(copy,{hpc_legacy_imported:true});
        }
        if(action==="ems-dhw-apply"&&pendingEmsDhw.length){
          const copy=HPC_FREE.normalize(p);
          let last=null;
          for(const candidate of pendingEmsDhw){
            const ids=new Set(Object.values(candidate.entities));
            let tank=copy.components.find(node=>node.type==='dhw_tank'&&(
              node.discovery?.provider==='ems-esp'&&node.discovery.id===candidate.id||
              Object.values(node.sensors||{}).some(id=>ids.has(id))));
            if(!tank){
              // Keep user-created tanks untouched rather than adding a
              // second, unconnected boiler-controlled storage.
              if(copy.components.some(node=>node.type==='dhw_tank'))continue;
              tank=HPC_FREE.newNode('dhw_tank',copy);
              if(!tank)continue;
              tank.name=candidate.name;
              copy.components.push(tank);
            }
            tank.discovery={provider:'ems-esp',id:candidate.id};
            for(const [key,id] of Object.entries(candidate.entities)){
              if(HPC_FREE.byType.dhw_tank.fields.includes(key)&&!tank.sensors[key])
                tank.sensors[key]=id;
            }
            last=tank;
          }
          if(!last)return;
          this._selectedId=last.id;
          return this._applyPlan(copy,{hpc_legacy_imported:true});
        }
        if(action==="ems-circuits-apply"&&pendingEmsCircuits.length){
          if(!window.confirm(t(
            "Erkannte EMS-ESP-Heizkreise und freie Messwertfelder ergänzen? Bestehende Sensoren und Leitungen bleiben unverändert.",
            "Add detected EMS-ESP circuits and empty sensor fields? Existing sensors and pipes remain unchanged.")))return;
          const copy=HPC_FREE.normalize(p);
          let selectedId=null,added=0;
          for(const candidate of pendingEmsCircuits){
            let node=matchedEmsCircuit(candidate,copy);
            if(!node){
              if(copy.components.filter(c=>c.type==='heating_circuit').length>=6)continue;
              node=HPC_FREE.newNode('heating_circuit',copy);
              if(!node)continue;
              node.name=candidate.name;
              copy.components.push(node);
              added++;
            }
            node.discovery={provider:'ems-esp',id:candidate.id};
            for(const [role,id] of Object.entries(candidate.entities)){
              if(HPC_FREE.byType.heating_circuit.fields.includes(role)&&
                !node.sensors[role])node.sensors[role]=id;
            }
            if(node.sensors.mixer)node.options={...node.options,mixed:true};
            selectedId=node.id;
          }
          if(!selectedId)return;
          this._selectedId=selectedId;
          return this._applyPlan(copy,{hpc_legacy_imported:true});
        }
        if(action==="ems-apply"&&chosenEms){
          const type=root.querySelector('#hpc-ems-type')?.value;
          if(!['oil_boiler','gas_boiler','pellet_boiler','wood_gasifier','heat_pump'].includes(type))return;
          const detectedIds=new Set(Object.values(chosenEms.entities));
          // Match by persistent device ID first, then by actual sensor IDs.
          // Never pick the first unrelated boiler merely because the fuel
          // happens to be the same.
          const sources=p.components.filter(c=>HPC_FREE.byType[c.type]?.group==="source");
          const match=sources.find(c=>c.discovery?.provider==='ems-esp'&&
            c.discovery.id===String(chosenEms.id))||
            sources.find(c=>Object.values(c.sensors||{}).some(id=>detectedIds.has(id)));
          const copy=HPC_FREE.normalize(p);
          const node=match?copy.components.find(c=>c.id===match.id):HPC_FREE.newNode(type,copy);
          if(!node)return;
          if(!match){
            node.name=chosenEms.genericName?emsTypeLabel(type):chosenEms.name.slice(0,75);
            copy.components.push(node);
          }
          // User-selected fuel type is authoritative; this also repairs old
          // auto-imports labeled as gas despite an existing oil burner.
          if(node.type!==type){
            const previousType=node.type;
            node.type=type;
            node.sensors=Object.fromEntries(Object.entries(node.sensors||{})
              .filter(([key])=>HPC_FREE.byType[type].fields.includes(key)&&
                // Do not rebrand a former burner flag or thermal power
                // measurement as the heat pump compressor/electric power.
                !(type==='heat_pump'&&previousType!=='heat_pump'&&
                  ['state','power'].includes(key))));
            node.options=type==='heat_pump'?{unit_style:'auto'}:{boiler_kind:'standard'};
          }
          node.discovery={provider:'ems-esp',id:String(chosenEms.id)};
          // EMS-ESP calls its burner status "burngas" even on boilers that
          // are not gas-fired. That is never a compressor-running signal.
          // "boilerpowerw" is not confirmed electric input power, either.
          // Only the water temperatures are unambiguous for a heat pump.
          const allowed=type==='heat_pump'?new Set(['flow','return']):null;
          for(const [key,id] of Object.entries(chosenEms.entities)){
            if((!allowed||allowed.has(key))&&
              HPC_FREE.byType[node.type].fields.includes(key)&&!node.sensors[key])
              node.sensors[key]=id;
          }
          this._selectedId=node.id;
          return this._applyPlan(copy,{hpc_legacy_imported:true});
        }
        if(action==="start")return this._applyPlan({components:[],connections:[]});
        if(action==="setup-create"){
          const selections=[
            ...[...root.querySelectorAll('[data-setup-source-type]')].map(select=>select.value),
            ...['buffer','dhw_tank','heating_circuit'].flatMap(type=>
              Array.from({length:Math.min(setupCount(type),type==='dhw_tank'?4:6)},()=>type))
          ];
          const next=HPC_FREE.normalize(this._config.plan);
          let last=null;
          for(const type of selections){
            const node=HPC_FREE.newNode(type,next);
            if(!node)continue;
            next.components.push(node);
            last=node;
          }
          if(!last)return;
          this._selectedId=last.id;
          const sources=next.components.filter(node=>
            HPC_FREE.byType[node.type]?.group==='source');
          const buffers=next.components.filter(node=>node.type==='buffer');
          if(sources.length===1&&buffers.length===1)
            Object.assign(next,HPC_FREE.connectPair(next,sources[0].id,buffers[0].id));
          if(buffers.length>1){
            const topology=root.querySelector('[data-setup-buffer-topology]')?.value;
            if(topology==='series'){
              if(sources.length===1)
                Object.assign(next,HPC_FREE.connectPair(next,sources[0].id,buffers[0].id));
              Object.assign(next,HPC_FREE.connectBufferSeries(next));
            }else if(topology==='parallel'&&sources.length===1){
              const parallel=HPC_FREE.connectBuffersParallel(next,sources[0].id);
              if(parallel)Object.assign(next,parallel);
            }
          }
          const buffer=HPC_FREE.preferredHeatingBuffer(next);
          if(buffer){
            for(const circuit of next.components.filter(node=>node.type==='heating_circuit'))
              Object.assign(next,HPC_FREE.connectHeatingCircuit(next,circuit.id,buffer)||next);
          }
          if(!buffers.length&&sources.length===1){
            const tanks=next.components.filter(node=>node.type==='dhw_tank');
            if(tanks.length===1)
              Object.assign(next,HPC_FREE.connectPair(next,sources[0].id,tanks[0].id));
          }
          return this._applyPlan(next);
        }
        if(action==="example"){
          if(p.components.length&&!window.confirm(
            t("Beispielanlage laden? Die aktuelle Konfiguration wird ersetzt.","Load example? This replaces the current configuration.")))return;
          return this._applyPlan(HPC_FREE.sample(),{hpc_legacy_imported:true});
        }
        if(action==="apply-count"){
          const type=button.dataset.countType;
          if(!['source','buffer','dhw_tank','heating_circuit'].includes(type))return;
          const input=root.querySelector(`[data-target-count="${type}"]`);
          const max=Number(input?.max)||20;
          const requested=Math.max(0,Math.min(max,Math.round(Number(input?.value)||0)));
          const currentCount=p.components.filter(node=>type==='source'
            ?HPC_FREE.byType[node.type]?.group==='source':node.type===type).length;
          if(requested<currentCount){
            if(input)input.value=String(currentCount);
            window.alert(t('Eine kleinere Anzahl entfernt keine Bauteile. Entferne einzelne Komponenten im jeweiligen Bereich, damit Leitungen und Sensoren vorher geprüft werden können.',
              'A lower count never removes components. Remove them individually in their section so affected pipes and sensors can be reviewed first.'));
            return;
          }
          if(requested===currentCount)return;
          const next=HPC_FREE.normalize(p);
          for(let index=currentCount;index<requested;index++){
            const node=HPC_FREE.newNode(type==='source'?'heat_pump':type,next);
            if(!node)break;
            next.components.push(node);
            if(type==='heating_circuit'){
              const bufferId=HPC_FREE.preferredHeatingBuffer(next);
              if(bufferId)Object.assign(next,HPC_FREE.connectHeatingCircuit(next,node.id,bufferId)||next);
            }else if(type==='buffer'){
              const sources=next.components.filter(item=>HPC_FREE.byType[item.type]?.group==='source');
              if(sources.length===1)Object.assign(next,HPC_FREE.connectPair(next,sources[0].id,node.id));
            }else if(type==='source'){
              const buffers=next.components.filter(item=>item.type==='buffer');
              if(buffers.length===1&&!next.connections.some(edge=>
                edge.from===node.id&&edge.to===buffers[0].id))
                Object.assign(next,HPC_FREE.connectPair(next,node.id,buffers[0].id));
            }
            this._selectedId=node.id;
          }
          return this._applyPlan(next);
        }
        if(action==="add-category"){
          const type=button.dataset.category==='other'
            ?root.querySelector('[data-add-type]')?.value:button.dataset.type;
          if(!type||!HPC_FREE.byType[type])return;
          const next=HPC_FREE.normalize(p);
          const node=HPC_FREE.newNode(type,next);
          if(!node)return;
          next.components.push(node);
          if(type==='heating_circuit'){
            const sourceId=HPC_FREE.preferredHeatingBuffer(next);
            if(sourceId)Object.assign(next,HPC_FREE.connectHeatingCircuit(next,node.id,sourceId)||next);
          }else if(HPC_FREE.byType[type].group==='source'){
            const buffers=next.components.filter(item=>item.type==='buffer');
            const sources=next.components.filter(item=>HPC_FREE.byType[item.type]?.group==='source');
            if(sources.length===1&&buffers.length===1&&
              !next.connections.some(edge=>edge.from===buffers[0].id||edge.to===buffers[0].id))
              Object.assign(next,HPC_FREE.connectPair(next,node.id,buffers[0].id));
          }else if(type==='buffer'){
            const sources=next.components.filter(item=>HPC_FREE.byType[item.type]?.group==='source');
            if(sources.length===1&&!next.connections.some(edge=>
              edge.from===node.id||edge.to===node.id))
              Object.assign(next,HPC_FREE.connectPair(next,sources[0].id,node.id));
          }
          this._selectedId=node.id;
          return this._applyPlan(next);
        }
        if(action==="component-connect"){
          const pair=root.querySelector(`[data-source-pair="${CSS.escape(button.dataset.component)}"]`)?.value||'';
          const [from,to]=pair.split('|');
          if(!from||!to)return;
          const next=HPC_FREE.connectPair(p,from,to);
          if(next.connections.length===p.connections.length)return;
          return this._applyPlan(next);
        }
        if(action==="add-component"){
          // An empty graph may coexist with an older, already configured card.
          // Preserve those generators, tanks and entities when the user chooses
          // the explicit "add component" action. Never fabricate pipework.
          const legacyFields=this._config?.generator_type||
            this._config?.boiler_type||this._config?.buffer===true||
            Number(this._config?.hc_count)>0||
            Object.values(this._config?.entities||{}).some(Boolean);
          const imported=!p.components.length&&legacyFields
            ?HPC_MIGRATION.upgrade(this._config,{classic:true}):null;
          const base=imported?.changed?imported.config.plan:p;
          const node=HPC_FREE.newNode(root.querySelector("#hpc-free-type")?.value,base);
          if(!node)return;
          this._selectedId=node.id;
          const retained=imported?.changed?{
            hpc_migration_backup:imported.config.hpc_migration_backup,
            hpc_migration_notes:imported.config.hpc_migration_notes,
            hpc_migration_review:imported.config.hpc_migration_review,
            hpc_legacy_imported:true
          }:{};
          let next={components:[...base.components,node],
            connections:base.connections};
          if(node.type==='heating_circuit'){
            const bufferId=HPC_FREE.preferredHeatingBuffer(next);
            if(bufferId)next=HPC_FREE.connectHeatingCircuit(next,node.id,bufferId)||next;
          }
          return this._applyPlan(next,retained);
        }
        if(action==="remove-component"){
          const id=button.dataset.component||selected?.id;
          const node=p.components.find(component=>component.id===id);
          if(!node)return;
          const affected=p.connections.filter(edge=>edge.from===id||edge.to===id);
          const detail=affected.map(edge=>{
            const other=p.components.find(component=>component.id===
              (edge.from===id?edge.to:edge.from));
            return `${edge.from===id?'→':'←'} ${other?.name||
              (edge.from===id?edge.to:edge.from)} (${edge.id})`;
          }).join('\n');
          const sensors=Object.keys(node.sensors||{});
          const sensorDetail=sensors.length
            ?t(`\nZugeordnete Messwerte: ${sensors.join(', ')}`,
              `\nAssigned measurements: ${sensors.join(', ')}`):'';
          if(!window.confirm(t(
            `„${node.name}“ entfernen? ${affected.length} hydraulische Verbindungen und ${sensors.length} Messwertzuordnungen werden entfernt.${detail?'\n'+detail:''}${sensorDetail}`,
            `Remove “${node.name}”? ${affected.length} hydraulic connections and ${sensors.length} sensor assignments will also be removed.${detail?'\n'+detail:''}${sensorDetail}`)))return;
          this._selectedId=null;
          return this._applyPlan({components:p.components.filter(c=>c.id!==id),
            connections:p.connections.filter(c=>c.from!==id&&c.to!==id)});
        }
        if(action==="dhw-route"){
          const tank=button.dataset.component;
          const source=root.querySelector(`[data-dhw-source="${CSS.escape(tank)}"]`)?.value;
          const kind=root.querySelector(`[data-dhw-kind="${CSS.escape(tank)}"]`)?.value;
          const style=root.querySelector(`[data-dhw-style="${CSS.escape(tank)}"]`)?.value||'branch';
          const control=root.querySelector(`[data-dhw-control="${CSS.escape(tank)}"]`)?.value||'';
          const buffer=root.querySelector(`[data-dhw-buffer="${CSS.escape(tank)}"]`)?.value||'';
          const next=kind==='diverter'&&buffer
            ?HPC_FREE.connectDhwBufferDiverter(p,source,tank,buffer,control)
            :HPC_FREE.connectDhwCharge(p,source,tank,kind,style,control);
          if(!next)return;
          return this._applyPlan(next);
        }
        if(action==="connect-pair"){
          const [from,to]=(root.querySelector('#hpc-pair')?.value||'').split('|');
          if(!from||!to)return;
          const next=HPC_FREE.connectPair(this._config.plan,from,to);
          if(next.connections.length===this._config.plan.connections.length)return;
          return this._applyPlan(next);
        }
        if(action==="hc-connect"){
          const circuit=p.components.find(node=>
            node.id===button.dataset.component&&node.type==='heating_circuit');
          const sourceId=root.querySelector(`[data-hc-source="${CSS.escape(button.dataset.component)}"]`)?.value;
          const kind=root.querySelector(`[data-hc-kind="${CSS.escape(button.dataset.component)}"]`)?.value||'direct';
          const mode=root.querySelector(`[data-hc-mode="${CSS.escape(button.dataset.component)}"]`)?.value||'automatic';
          const controlId=root.querySelector(`[data-hc-control="${CSS.escape(button.dataset.component)}"]`)?.value||'';
          if(!circuit)return;
          if(mode==='manual'||kind==='custom'){
            const manual=root.querySelector('[data-hc-manual-wrap]');
            if(manual)manual.hidden=false;
            const advanced=[...root.querySelectorAll('.hpc-advanced-pipes')]
              .find(details=>details.querySelector('#hpc-from'));
            if(advanced)advanced.open=true;
            return;
          }
          if(!sourceId){
            window.alert(t('Bitte eine Wärmequelle auswählen.','Choose a heat source.'));
            return;
          }
          if(['pump','mixer'].includes(kind)&&!controlId){
            window.alert(t('Bitte die vorhandene Pumpengruppe oder den Mischer auswählen.',
              'Choose the existing pump group or mixer.'));
            return;
          }
          const hasCircuitEdges=p.connections.some(edge=>
            edge.to===circuit.id&&edge.to_port==='flow_in'||
            edge.from===circuit.id&&edge.from_port==='return_out');
          const replace=!!circuit.options?.hydraulic_auto&&hasCircuitEdges;
          if(hasCircuitEdges&&!window.confirm(t(
            'Vorhandene automatische Heizkreisverbindung gemeinsam ersetzen? Manuelle Leitungen bleiben unverändert.',
            'Replace the existing automatic heating-circuit pair? Manual pipes remain unchanged.')))return;
          const next=HPC_FREE.connectHeatingCircuit(p,circuit.id,sourceId,kind,controlId,{replace});
          if(!next){
            window.alert(t(
              'Die vorhandenen Leitungen passen nicht zu dieser Auswahl und wurden nicht verändert. Prüfe den manuellen Anschluss.',
              'Existing pipes do not match this selection and were left unchanged. Check the manual connection.'));
            return;
          }
          return this._applyPlan(next);
        }
        if(action==="connect"){
          const [from,from_port]=(root.querySelector("#hpc-from")?.value||"").split("|");
          const [to,to_port]=(root.querySelector("#hpc-to")?.value||"").split("|");
          if(!HPC_FREE.validConnection(p,from,from_port,to,to_port))return;
          const id=(()=>{let i=1;const seen=new Set(p.connections.map(x=>x.id));while(seen.has("leitung_"+i))i++;return "leitung_"+i;})();
          return this._applyPlan({components:p.components,connections:[...p.connections,{id,from,from_port,to,to_port}]});
        }
        if(action==="buffer-series"){
          const next=HPC_FREE.connectBufferSeries(p);
          if(next.connections.length===p.connections.length)return;
          return this._applyPlan(next);
        }
        if(action==="buffer-parallel"){
          const source=root.querySelector('#hpc-buffer-source')?.value;
          const next=HPC_FREE.connectBuffersParallel(p,source);
          if(!next){
            const notice=root.querySelector('#hpc-buffer-notice');
            if(notice)notice.textContent=t(
              'Bestehende Pufferverbindungen zuerst prüfen: eine Reihenschaltung wird nicht automatisch überschrieben.',
              'Check existing buffer connections: confirmed series piping is never overwritten.');
            return;
          }
          if(next.connections.length===p.connections.length)return;
          return this._applyPlan(next);
        }
        if(action==="remove-edge"){
          return this._applyPlan({components:p.components,connections:p.connections.filter(c=>c.id!==button.dataset.edgeId)});
        }
        if(action==="add-level"&&selected){
          return changePlan(plan=>{
            const c=plan.components.find(x=>x.id===selected.id);
            if(!c)return;
            const taken=new Set((c.level_sensors||[]).map(p=>p.position));
            let pos=25;while(taken.has(pos)&&pos<100)pos+=5;
            c.level_sensors=[...(c.level_sensors||[]),{position:pos,entity:""}];
            // New fields are initially blank until an entity is selected.
          });
        }
        if(action==="remove-level"&&selected){
          return changePlan(plan=>{
            const c=plan.components.find(x=>x.id===selected.id);
            c.level_sensors=(c.level_sensors||[]).filter((_,i)=>i!==Number(button.dataset.index));
          });
        }
      }));
      const fromSelect=root.querySelector("#hpc-from");
      const toSelect=root.querySelector("#hpc-to");
      root.querySelectorAll('[data-component-type]').forEach(select=>
        select.addEventListener('change',()=>{
          const next=HPC_FREE.normalize(this._config.plan);
          const node=next.components.find(item=>item.id===select.dataset.componentType);
          const type=select.value;
          if(!node||!HPC_FREE.byType[type]||HPC_FREE.byType[type].group!==
            HPC_FREE.byType[node.type]?.group)return;
          const previousType=node.type;
          const lostSensors=Object.keys(node.sensors||{})
            .filter(key=>!HPC_FREE.byType[type].fields.includes(key));
          node.type=type;
          const incompatible=next.connections.filter(edge=>
            (edge.from===node.id||edge.to===node.id)&&
            !HPC_FREE.validConnection(next,edge.from,edge.from_port,edge.to,edge.to_port));
          node.type=previousType;
          const impact=[
            ...incompatible.map(edge=>`${edge.from} → ${edge.to} (${edge.id})`),
            ...(lostSensors.length?[`${t('Sensorzuordnungen','Sensor assignments')}: ${lostSensors.join(', ')}`]:[])
          ];
          if(impact.length&&!window.confirm(t(
            `Typ von „${node.name}“ von ${HPC_FREE.display(previousType,lang)} zu ${HPC_FREE.display(type,lang)} ändern? Folgendes wird entfernt:\n${impact.join('\n')}`,
            `Change “${node.name}” from ${HPC_FREE.display(previousType,lang)} to ${HPC_FREE.display(type,lang)}? This will remove:\n${impact.join('\n')}`))){
            this._renderFlex();
            return;
          }
          const defaults=HPC_FREE.newNode(type,next);
          node.type=type;
          node.sensors=Object.fromEntries(Object.entries(node.sensors||{})
            .filter(([key])=>HPC_FREE.byType[type].fields.includes(key)));
          const preservedOptions=type==='heat_pump'
            ?Object.fromEntries(['unit_style','unit_size'].filter(key=>node.options?.[key]!==undefined)
              .map(key=>[key,node.options[key]]))
            :['oil_boiler','gas_boiler','pellet_boiler'].includes(type)
              ?{boiler_kind:node.options?.boiler_kind||'standard'}
              :type==='wood_chip_boiler'
                ?Object.fromEntries(['eta_model','eta_view','silo','particle_separator']
                  .filter(key=>node.options?.[key]!==undefined).map(key=>[key,node.options[key]]))
                :defaults?.options||{};
          node.options={...(defaults?.options||{}),...preservedOptions};
          next.connections=next.connections.filter(edge=>!incompatible.includes(edge));
          return this._applyPlan(next);
        }));
      root.querySelectorAll('[data-hc-mode]').forEach(select=>
        select.addEventListener('change',()=>{
          const manual=select.value==='manual';
          const wrap=select.closest('[data-heating-connection]')?.querySelector('[data-hc-manual-wrap]');
          if(wrap)wrap.hidden=!manual;
        }));
      root.querySelectorAll('[data-hc-kind]').forEach(select=>
        select.addEventListener('change',()=>{
          const wrap=select.closest('[data-heating-connection]')?.querySelector('[data-hc-control-wrap]');
          if(wrap)wrap.hidden=!['pump','mixer'].includes(select.value);
        }));
      root.querySelectorAll('[data-dhw-kind]').forEach(select=>
        select.addEventListener('change',()=>{
          const wrap=select.closest('details')?.querySelector('[data-dhw-control-wrap]');
          if(wrap)wrap.hidden=select.value==='direct';
          const buffer=select.closest('details')?.querySelector('[data-dhw-buffer-wrap]');
          if(buffer)buffer.hidden=select.value!=='diverter';
        }));
      fromSelect?.addEventListener("change",()=>{
        toSelect.innerHTML='<option value="">–</option>'+portOptions("to",fromSelect.value);
      });
      root.querySelectorAll("[data-select]").forEach(b=>b.addEventListener("click",()=>{this._selectedId=b.dataset.select;this._renderFlex();}));
      const fieldUpdate=(selector,fn)=>root.querySelectorAll(selector).forEach(el=>el.addEventListener("change",()=>changePlan(plan=>fn(plan,el))));
      root.querySelectorAll("[data-return-lift]").forEach(el=>el.addEventListener("change",()=>changePlan(plan=>{
        const c=plan.components.find(x=>x.id===el.dataset.returnLift);
        if(c?.type==="wood_gasifier")c.options={...c.options,return_lift:el.checked};
      })));
      fieldUpdate('[data-mixer-inverted]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.mixerInverted);
        if(node&&['wood_gasifier','heating_circuit','mixer'].includes(node.type))
          node.options={...node.options,mixer_inverted:el.checked};
      });
      fieldUpdate('[data-source-type]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.sourceType);
        if(!node||node.type!=='gas_boiler'||el.value!=='oil_boiler')return;
        node.type='oil_boiler';
        if(['Gaskessel','Gas boiler'].includes(node.name))node.name='Ölkessel';
        node.options={boiler_kind:node.options?.boiler_kind||'standard'};
        // Shared flow/return ports and existing sensor assignments survive.
      });
      fieldUpdate('[data-diverter-port]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.diverterPort);
        if(node?.type==='diverter')node.options={...node.options,
          dhw_port:el.value==='b'?'b':'a'};
      });
      fieldUpdate('[data-diverter-dhw]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.diverterDhw);
        if(node?.type==='diverter')node.options={...node.options,
          dhw_state:el.value.slice(0,60)};
      });
      fieldUpdate('[data-diverter-heating]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.diverterHeating);
        if(node?.type==='diverter')node.options={...node.options,
          heating_state:el.value.slice(0,60)};
      });
      for(const [selector,option] of [
        ['[data-mixer-a-state]','a_closed_state'],
        ['[data-mixer-b-state]','b_closed_state']
      ])fieldUpdate(selector,(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.mixerAState||
          c.id===el.dataset.mixerBState);
        if(node?.type!=='mixer')return;
        node.options={...node.options};
        const value=el.value.trim().slice(0,60);
        if(value)node.options[option]=value;
        else delete node.options[option];
      });
      for(const [selector,option] of [
        ['[data-mixer-a-position]','a_closed_at'],
        ['[data-mixer-b-position]','b_closed_at']
      ])fieldUpdate(selector,(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.mixerAPosition||
          c.id===el.dataset.mixerBPosition);
        if(node?.type!=='mixer')return;
        node.options={...node.options};
        const value=el.value===''?NaN:Number(el.value);
        if(Number.isFinite(value)&&value>=0&&value<=100)node.options[option]=value;
        else delete node.options[option];
      });
      fieldUpdate('[data-wp-style]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.wpStyle);
        if(node?.type==='heat_pump')node.options={...node.options,unit_style:el.value};
      });
      fieldUpdate('[data-wp-size]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.wpSize);
        if(node?.type!=='heat_pump')return;
        node.options={...node.options};
        if(el.value)node.options.unit_size=el.value;
        else delete node.options.unit_size;
      });
      fieldUpdate("[data-boiler-kind]",(plan,el)=>{
        const c=plan.components.find(x=>x.id===el.dataset.boilerKind);
        if(c)c.options={...c.options,boiler_kind:el.value};
      });
      root.querySelectorAll('[data-hc-mixer]').forEach(el=>el.addEventListener('change',()=>changePlan(plan=>{
        const node=plan.components.find(c=>c.id===el.dataset.hcMixer);
        if(node?.type!=='heating_circuit')return;
        node.options={...node.options,mixed:el.checked};
        // Keep an existing sensor for a future re-enable. The renderer and
        // sensor form both honor mixed:false without deleting it.
      })));
      fieldUpdate('[data-heating-emitter]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.heatingEmitter);
        if(node?.type==='heating_circuit'&&HFC_EMITTERS.includes(el.value))
          node.options={...node.options,emitter:el.value};
      });
      root.querySelectorAll('[data-fuel-silo]').forEach(el=>el.addEventListener('change',()=>changePlan(plan=>{
        const node=plan.components.find(c=>c.id===el.dataset.fuelSilo);
        if(['wood_chip_boiler','pellet_boiler'].includes(node?.type))
          node.options={...node.options,silo:el.checked};
      })));
      root.querySelectorAll('[data-eta-particle]').forEach(el=>el.addEventListener('change',()=>changePlan(plan=>{
        const node=plan.components.find(c=>c.id===el.dataset.etaParticle);
        if(node?.type==='wood_chip_boiler')node.options={...node.options,particle_separator:el.checked};
      })));
      fieldUpdate('[data-dhw-style]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.dhwStyle);
        if(node?.type==='dhw_tank')
          node.options={...node.options,connection_style:el.value==='branch'?'branch':'separate'};
      });
      fieldUpdate('[data-froeling-view]',(plan,el)=>{
        const node=plan.components.find(n=>n.id===el.dataset.froelingView);
        if(node?.type==='wood_gasifier')node.options={...node.options,
          froeling_view:el.value==='classic'?'classic':'s3_turbo'};
      });
      fieldUpdate('[data-eta-view]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.etaView);
        if(node?.type==='wood_chip_boiler')node.options={...node.options,
          eta_view:el.value==='cutaway'?'cutaway':'closed'};
      });
      fieldUpdate('[data-eta-model]',(plan,el)=>{
        const node=plan.components.find(c=>c.id===el.dataset.etaModel);
        if(node?.type==='wood_chip_boiler')node.options={...node.options,eta_model:el.value};
      });
      fieldUpdate("[data-name]",(plan,el)=>{const c=plan.components.find(x=>x.id===el.dataset.name);if(c)c.name=el.value.slice(0,75);});
      fieldUpdate("[data-sensor]",(plan,el)=>{const c=plan.components.find(x=>x.id===el.dataset.sensor);if(c){
        if(el.value)c.sensors[el.dataset.field]=el.value;else delete c.sensors[el.dataset.field];
      }});
      fieldUpdate("input[data-edge]",(plan,el)=>{const c=plan.connections.find(x=>x.id===el.dataset.edge);if(c)c[el.dataset.edgeField]=el.value;});
      fieldUpdate("[data-level-pos]",(plan,el)=>{const c=plan.components.find(x=>x.id===el.dataset.levelPos);
        if(c?.level_sensors?.[Number(el.dataset.levelIndex)])c.level_sensors[Number(el.dataset.levelIndex)].position=Number(el.value);
      });
      fieldUpdate("[data-level-entity]",(plan,el)=>{const c=plan.components.find(x=>x.id===el.dataset.levelEntity);
        if(c?.level_sensors?.[Number(el.dataset.levelIndex)])c.level_sensors[Number(el.dataset.levelIndex)].entity=el.value;
      });
      const title=root.querySelector("#hpc-free-title");
      title?.addEventListener("change",()=>this._save({...this._config,title:title.value}));

    }
  }
  return { HydraulicPlanCard, HydraulicPlanCardEditor };
})();
