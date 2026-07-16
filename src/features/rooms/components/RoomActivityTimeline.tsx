"use client";

import * as React from "react";
import { PlusCircle, Image, Settings, FileDown, CheckCircle2, Shield, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { db } from "@/lib/firebase/firestore";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Activity {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface RoomActivityTimelineProps {
  roomId: string;
  createdAtDate: Date;
  photoCount: number;
  downloadRequestCount: number;
}

export function RoomActivityTimeline({
  roomId,
  createdAtDate,
  photoCount,
  downloadRequestCount,
}: RoomActivityTimelineProps) {
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchActivities() {
      try {
        const q = query(
          collection(db, "notifications"),
          where("relatedId", "==", roomId),
          orderBy("createdAt", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);
        
        const fetchedActivities: Activity[] = snap.docs.map((doc) => {
          const d = doc.data();
          let icon = Settings;
          let color = "text-zinc-500 bg-zinc-500/10 border-zinc-200 dark:border-zinc-800";

          if (d.type === "photo_uploaded") {
            icon = Image;
            color = "text-blue-500 bg-blue-500/10 border-blue-200 dark:border-blue-900/30";
          } else if (d.type === "download_requested") {
            icon = FileDown;
            color = "text-yellow-500 bg-yellow-500/10 border-yellow-200 dark:border-yellow-900/30";
          } else if (d.type === "download_approved") {
            icon = CheckCircle2;
            color = "text-green-500 bg-green-500/10 border-green-200 dark:border-green-900/30";
          }

          return {
            id: doc.id,
            type: d.type || "general",
            title: d.title || "Activity logged",
            message: d.message || "",
            timestamp: d.createdAt ? d.createdAt.toDate() : new Date(),
            icon,
            color,
          };
        });

        // Always add "Room Created" as the root activity
        const baseActivities = [...fetchedActivities];
        const hasCreated = baseActivities.some(a => a.type === "room_created" || a.title.toLowerCase().includes("created"));
        
        if (!hasCreated) {
          baseActivities.push({
            id: "created",
            type: "room_created",
            title: "Virtual Room Initialized",
            message: "Unique Room ID and secure hashed credentials generated.",
            timestamp: createdAtDate,
            icon: PlusCircle,
            color: "text-primary bg-primary/10 border-primary-200 dark:border-primary-900/30",
          });
        }

        // Add photo milestone log if photoCount > 0 and no upload activity is present
        if (photoCount > 0 && !baseActivities.some(a => a.type === "photo_uploaded")) {
          baseActivities.unshift({
            id: "photos-milestone",
            type: "photo_uploaded",
            title: "Photos Added",
            message: `Event gallery is active with ${photoCount} photos available.`,
            timestamp: new Date(createdAtDate.getTime() + 10 * 60000), // Mock 10 mins later
            icon: Image,
            color: "text-blue-500 bg-blue-500/10 border-blue-200 dark:border-blue-900/30",
          });
        }

        // Sort by timestamp descending
        baseActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(baseActivities);
      } catch (err) {
        console.error("Failed to load room activities:", err);
        // Fallback to basic static timeline if error or index not ready
        setActivities([
          {
            id: "created",
            type: "room_created",
            title: "Virtual Room Initialized",
            message: "Unique Room ID and secure hashed credentials generated.",
            timestamp: createdAtDate,
            icon: PlusCircle,
            color: "text-primary bg-primary/10 border-primary-200 dark:border-primary-900/30",
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchActivities();
  }, [roomId, createdAtDate, photoCount, downloadRequestCount]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-card rounded-xl border border-border">
        <LoadingSpinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <Card className="border border-border bg-card/65 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
        ) : (
          <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-4 space-y-6 pb-2">
            {activities.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <div key={activity.id} className="relative pl-7 group">
                  {/* Timeline Dot */}
                  <span className={`absolute left-[-13px] top-0 flex items-center justify-center w-6 h-6 rounded-full border ${activity.color}`}>
                    <IconComponent className="h-3.5 w-3.5" />
                  </span>

                  {/* Log Card */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">
                        {activity.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium bg-secondary px-2 py-0.5 rounded-full">
                        {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {activity.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      {activity.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default RoomActivityTimeline;
