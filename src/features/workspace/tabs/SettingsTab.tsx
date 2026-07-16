"use client";

import * as React from "react";
import { Controller } from "react-hook-form";
import { MapPin, Shield, Calendar, Clock, Trash2, CheckCircle, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Switch } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { VirtualRoom } from "@/types";

export interface SettingsTabProps {
  room: VirtualRoom;
  register: any;
  handleSubmit: any;
  control: any;
  formErrors: any;
  watchAutoCloseRoom: boolean;
  isSavingSettings: boolean;
  handleSettingsSubmit: (data: any) => void;
  setIsDeleteOpen: (val: boolean) => void;
}

export function SettingsTab({
  room,
  register,
  handleSubmit,
  control,
  formErrors,
  watchAutoCloseRoom,
  isSavingSettings,
  handleSettingsSubmit,
  setIsDeleteOpen
}: SettingsTabProps) {
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <form onSubmit={handleSubmit(handleSettingsSubmit)} className="space-y-6">
        
        {/* Event detail settings */}
        <Card className="border border-border bg-card/65 backdrop-blur-sm shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-sm font-bold text-foreground">Room Settings & Metadata</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              Update name, date, location details, or cover images of this virtual room.
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground border-b border-border pb-2 uppercase tracking-wider select-none">
                Event Information
              </h3>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">Event Name</label>
                <Input
                  type="text"
                  {...register("name")}
                  error={!!formErrors.name}
                  helperText={formErrors.name?.message}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">Event Type</label>
                  <Controller
                    name="eventType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        options={[
                          { label: "Wedding", value: "wedding" },
                          { label: "Birthday", value: "birthday" },
                          { label: "Corporate", value: "corporate" },
                          { label: "Portrait", value: "portrait" },
                          { label: "Other", value: "other" },
                        ]}
                        className="rounded-xl text-xs"
                      />
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">Event Date</label>
                  <Input
                    type="date"
                    {...register("eventDate")}
                    error={!!formErrors.eventDate}
                    helperText={formErrors.eventDate?.message}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">Event Time</label>
                  <Input
                    type="time"
                    {...register("eventTime")}
                    error={!!formErrors.eventTime}
                    helperText={formErrors.eventTime?.message}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Location details */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 border-t border-border pt-4 select-none">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  Event Location
                </h4>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">Street Address (Optional)</label>
                  <Input
                    type="text"
                    {...register("eventLocation.street")}
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">City</label>
                    <Input
                      type="text"
                      {...register("eventLocation.city")}
                      error={!!formErrors.eventLocation?.city}
                      helperText={formErrors.eventLocation?.city?.message}
                      className="rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">State</label>
                    <Input
                      type="text"
                      {...register("eventLocation.state")}
                      error={!!formErrors.eventLocation?.state}
                      helperText={formErrors.eventLocation?.state?.message}
                      className="rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">Country</label>
                    <Input
                      type="text"
                      {...register("eventLocation.country")}
                      error={!!formErrors.eventLocation?.country}
                      helperText={formErrors.eventLocation?.country?.message}
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">Description (Optional)</label>
                <Textarea
                  {...register("description")}
                  error={!!formErrors.description}
                  helperText={formErrors.description?.message}
                  className="rounded-xl text-xs min-h-[80px]"
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">Cover Image URL (Optional)</label>
                <Input
                  type="text"
                  {...register("coverImage")}
                  error={!!formErrors.coverImage}
                  helperText={formErrors.coverImage?.message}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Configurations settings toggles */}
        <Card className="border border-border bg-card/65 backdrop-blur-sm shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-sm font-bold text-foreground">Room Configurations</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
              Control security options, download limitations, and facial match automation.
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground select-none">Allow Guest Access</p>
                <p className="text-[10px] text-muted-foreground">Guests can scan the QR code and browse the gallery.</p>
              </div>
              <Controller
                name="allowGuestAccess"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground select-none">Require Face Verification (AI)</p>
                <p className="text-[10px] text-muted-foreground">Force attendees to register a selfie before viewing photos.</p>
              </div>
              <Controller
                name="requireFaceVerification"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground select-none">Allow Download Requests</p>
                <p className="text-[10px] text-muted-foreground">Guests can request watermark-free photo downloads.</p>
              </div>
              <Controller
                name="allowDownloadRequests"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onChange={field.onChange} />
                )}
              />
            </div>

            <div className="space-y-4 p-3.5 rounded-xl border border-border bg-zinc-50/50 dark:bg-zinc-900/20">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground select-none">Auto Close Room</p>
                  <p className="text-[10px] text-muted-foreground">Automatically closes guest access on a specific date.</p>
                </div>
                <Controller
                  name="autoCloseRoom"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onChange={field.onChange} />
                  )}
                />
              </div>

              {watchAutoCloseRoom && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider select-none">Close Date</label>
                  <Input
                    type="date"
                    {...register("autoCloseDate")}
                    error={!!formErrors.autoCloseDate}
                    helperText={formErrors.autoCloseDate?.message}
                    className="rounded-xl text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="submit"
                disabled={isSavingSettings}
                className="bg-primary text-primary-foreground font-bold rounded-xl shadow-md shadow-primary/10 px-5"
              >
                {isSavingSettings ? <LoadingSpinner className="h-4 w-4 mr-1.5" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                Save Settings
              </Button>
            </div>

          </CardContent>
        </Card>

      </form>

      {/* Danger Zone */}
      <Card className="border border-red-500/20 bg-red-500/5 shadow-sm rounded-2xl select-none">
        <CardHeader className="border-b border-red-500/10 pb-4">
          <CardTitle className="text-sm font-bold text-red-500 flex items-center gap-1.5">
            Danger Zone
          </CardTitle>
          <p className="text-[10px] text-red-500/80 mt-0.5 font-semibold">
            Permanently delete this virtual room. This deletes all database references and is irreversible.
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <Button
            variant="destructive"
            onClick={() => setIsDeleteOpen(true)}
            className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Delete Virtual Room
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
export default SettingsTab;
