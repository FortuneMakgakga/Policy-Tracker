import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface TimelineEvent {
  stage: string;
  label: string;
  timestamp?: string;
  completed: boolean;
  current?: boolean;
}

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event, idx) => (
        <div key={idx} className="flex gap-4">
          <div className="flex flex-col items-center">
            {event.completed ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : event.current ? (
              <Clock className="w-6 h-6 text-blue-500 animate-pulse" />
            ) : (
              <Circle className="w-6 h-6 text-gray-600" />
            )}
            {idx < events.length - 1 && (
              <div className={`w-0.5 h-12 mt-2 ${event.completed ? 'bg-green-500' : 'bg-gray-700'}`} />
            )}
          </div>
          
          <div className="flex-1 pb-8">
            <div className={`${event.current ? 'text-blue-400' : event.completed ? 'text-white' : 'text-gray-500'}`}>
              {event.label}
            </div>
            {event.timestamp && (
              <div className="text-gray-400 text-sm mt-1">
                {new Date(event.timestamp).toLocaleString('en-ZA', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
