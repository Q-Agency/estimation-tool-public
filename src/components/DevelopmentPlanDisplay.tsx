import { DevelopmentPlan } from '@/types';

interface DevelopmentPlanDisplayProps {
  plan: DevelopmentPlan;
}

export const DevelopmentPlanDisplay = ({ plan }: DevelopmentPlanDisplayProps) => {
  return (
    <div className="space-y-6">
      {/* Phases Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Development Phases</h3>
        <div className="space-y-6">
          {plan.phases.map((phase, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-800">{phase.name}</h4>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  Sprints {phase.sprints.start}-{phase.sprints.end}
                </span>
              </div>
              <ul className="space-y-2">
                {phase.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-cutting Concerns Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800">Cross-cutting Concerns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(plan.cross_cutting).map(([category, items]: [string, string[]]) => (
            <div key={category} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <h4 className="text-lg font-medium text-gray-800 capitalize mb-3">{category}</h4>
              <ul className="space-y-2">
                {items.map((item: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 