export const ANNOUNCEMENT_MAX_LENGTH = 2000;
export const ANNOUNCEMENTS_UPDATED_EVENT = "amatyc-announcements-updated";

export interface Announcement {
  id: string;
  message: string;
  created_at: string;
}

export interface PostedAnnouncement extends Announcement {
  recipient_count: number;
}
