// import React from 'react';
// import { CheckCircle, Clock, Wrench, Home, XCircle, AlertCircle } from 'lucide-react';

// const BookingTracker = ({ status }) => {
//   // Define the normal flow stages
//   const stages = [
//     { key: 'Pending', label: 'Booking Placed', icon: Clock },
//     { key: 'Confirmed', label: 'Confirmed', icon: CheckCircle },
//     { key: 'In-Progress', label: 'In Progress', icon: Wrench },
//     { key: 'Completed', label: 'Completed', icon: Home },
//   ];

//   // Handle special statuses (Cancelled, Rejected, AutoCancelled)
//   if (status === 'Cancelled' || status === 'AutoCancelled') {
//     return (
//       <div className="flex items-center justify-center gap-2 py-2 px-4 bg-red-50 border border-red-200 rounded-lg">
//         <XCircle className="text-red-600" size={18} />
//         <div className="text-center">
//           <p className="text-xs font-semibold text-red-800">
//             {status === 'AutoCancelled' ? 'Auto Cancelled' : 'Cancelled'}
//           </p>
//         </div>
//       </div>
//     );
//   }

//   if (status === 'Rejected') {
//     return (
//       <div className="flex items-center justify-center gap-2 py-2 px-4 bg-orange-50 border border-orange-200 rounded-lg">
//         <AlertCircle className="text-orange-600" size={18} />
//         <div className="text-center">
//           <p className="text-xs font-semibold text-orange-800">Rejected</p>
//         </div>
//       </div>
//     );
//   }

//   // Get current stage index
//   const currentIndex = stages.findIndex(stage => stage.key === status);

//   return (
//     <div className="py-1.5 px-2">
//       <div className="flex items-start justify-end relative gap-1">
//         {stages.map((stage, index) => {
//           const Icon = stage.icon;
//           const isCompleted = index < currentIndex || status === 'Completed';
//           const isCurrent = index === currentIndex;
//           const isPending = index > currentIndex && status !== 'Completed';

//           return (
//             <React.Fragment key={stage.key}>
//               {/* Stage Circle */}
//               <div className="flex flex-col items-center relative z-10">
//                 <div
//                   className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
//                     isCompleted || (isCurrent && status === 'Completed')
//                       ? 'bg-gradient-to-br from-purple-600 to-purple-700 shadow-md'
//                       : isCurrent
//                       ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-md animate-pulse'
//                       : 'bg-gray-200'
//                   }`}
//                 >
//                   <Icon
//                     size={14}
//                     className={`${
//                       isCompleted || isCurrent ? 'text-white' : 'text-gray-400'
//                     }`}
//                   />
//                 </div>
//                 <p
//                   className={`mt-1 text-[9px] font-medium text-center max-w-[50px] leading-tight ${
//                     isCompleted || isCurrent ? 'text-gray-800' : 'text-gray-400'
//                   }`}
//                 >
//                   {stage.label}
//                 </p>
//               </div>

//               {/* Progress Line */}
//               {index < stages.length - 1 && (
//                 <div className="flex items-center" style={{ paddingTop: '16px' }}>
//                   <div className="w-12 h-0.5 relative">
//                     <div className="absolute inset-0 bg-gray-200 rounded-full" />
//                     <div
//                       className={`absolute inset-0 rounded-full transition-all duration-500 ${
//                         index < currentIndex || status === 'Completed'
//                           ? 'bg-gradient-to-r from-purple-600 to-purple-700 w-full'
//                           : 'bg-gray-200 w-0'
//                       }`}
//                     />
//                   </div>
//                 </div>
//               )}
//             </React.Fragment>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// export default BookingTracker;

import React from "react";
import { CheckCircle, Clock, Wrench, Home, XCircle, AlertCircle } from "lucide-react";

const BookingTracker = ({ status }) => {
  const stages = [
    { key: "Pending", label: "Placed", icon: Clock },
    { key: "Confirmed", label: "Confirmed", icon: CheckCircle },
    { key: "In-Progress", label: "Working", icon: Wrench },
    { key: "Completed", label: "Completed", icon: Home },
  ];

  if (status === "Cancelled" || status === "AutoCancelled") {
    return (
      <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-red-50 border border-red-200 rounded-md">
        <XCircle className="text-red-600" size={14} />
        <p className="text-[11px] font-semibold text-red-700">
          {status === "AutoCancelled" ? "Auto-Cancelled" : "Cancelled"}
        </p>
      </div>
    );
  }

  if (status === "Rejected") {
    return (
      <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-orange-50 border border-orange-200 rounded-md">
        <AlertCircle className="text-orange-600" size={14} />
        <p className="text-[11px] font-semibold text-orange-700">Rejected</p>
      </div>
    );
  }

  const currentIndex = stages.findIndex((stage) => stage.key === status);

  return (
    <div className="py-1 px-1">
      <div className="flex items-start gap-1">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isCompleted = index < currentIndex || status === "Completed";
          const isCurrent = index === currentIndex;
          const allCompleted = status === "Completed";

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 transform ${
                    allCompleted
                      ? "bg-green-500 shadow-md scale-110 animate-bounce"
                      : isCompleted
                      ? "bg-purple-600 shadow-sm scale-105"
                      : isCurrent
                      ? "bg-blue-500 shadow-md animate-pulse scale-110"
                      : "bg-gray-300 scale-100"
                  }`}
                  style={{
                    animationDuration: allCompleted ? "1s" : "2s",
                    animationIterationCount: allCompleted ? "3" : "infinite"
                  }}
                >
                  <Icon
                    size={13}
                    className={`${isCompleted || isCurrent ? "text-white" : "text-gray-500"} transition-all duration-300`}
                  />
                </div>

                <p
                  className={`mt-1 text-[12px] font-medium text-center transition-all duration-300 ${
                    allCompleted
                      ? "text-green-600 font-bold"
                      : isCompleted || isCurrent
                      ? "text-gray-700"
                      : "text-gray-500"
                  }`}
                >
                  {stage.label}
                </p>
              </div>

              {index < stages.length - 1 && (
                <div className="flex items-center pt-[14px]">
                  <div className="w-10 h-0.5 bg-gray-300 relative overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-700 ease-out ${
                        allCompleted
                          ? "bg-green-500 w-full"
                          : index < currentIndex
                          ? "bg-purple-600 w-full"
                          : "w-0"
                      }`}
                      style={{
                        animation: (allCompleted || index < currentIndex) ? "slideIn 0.7s ease-out" : "none"
                      }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default BookingTracker;
