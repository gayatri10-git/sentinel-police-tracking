export type UserRole = 'admin' | 'officer' | 'citizen';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  created_at: any;
}

export type OfficerStatus = 'on_duty' | 'off_duty' | 'on_scene';

export interface Officer {
  id: string;
  user_id: string;
  name: string;
  badge_number: string;
  status: OfficerStatus;
  latitude: number;
  longitude: number;
  current_incident_id?: string;
  total_resolved: number;
  updated_at: any;
}

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'Pending' | 'Assigned' | 'In Progress' | 'Resolved' | 'False Alarm';

export interface Incident {
  id: string;
  type: string;
  severity: IncidentSeverity;
  description: string;
  photo_url?: string;
  ai_summary?: string;
  ai_tags?: string[];
  latitude: number;
  longitude: number;
  status: IncidentStatus;
  assigned_officer_id?: string;
  assigned_at?: any;
  resolved_at?: any;
  created_at: any;
  reporter_id: string;
}

export interface IncidentTimeline {
  id: string;
  incident_id: string;
  action: string;
  actor_name: string;
  timestamp: any;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  read: boolean;
  created_at: any;
}
