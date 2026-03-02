 import React from 'react';
 
 const CubeGridAnimation: React.FC = () => {
   const n = 4;
   const cubes = Array.from({ length: n * n }, (_, index) => {
     const i = index % n;
     const j = Math.floor(index / n);
     return { i, j, key: index };
   });
 
   return (
     <div className="cube-grid-container">
       <div 
         className="cube-grid"
         style={{ '--n': n } as React.CSSProperties}
       >
         {cubes.map((cube) => (
           <div
             key={cube.key}
             className="cube"
             style={{
               '--i': cube.i,
               '--j': cube.j,
             } as React.CSSProperties}
           >
             <div className="cube-face cube-face-right" />
             <div className="cube-face cube-face-bottom" />
           </div>
         ))}
       </div>
     </div>
   );
 };
 
 export default CubeGridAnimation;