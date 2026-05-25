export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          completed_at: string | null
          id: string
          reason: string | null
          requested_at: string | null
          scheduled_deletion_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          reason?: string | null
          requested_at?: string | null
          scheduled_deletion_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          reason?: string | null
          requested_at?: string | null
          scheduled_deletion_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          achieved_at: string | null
          achievement_name: string | null
          achievement_type: string | null
          description: string | null
          id: number
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          achievement_name?: string | null
          achievement_type?: string | null
          description?: string | null
          id?: never
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          achievement_name?: string | null
          achievement_type?: string | null
          description?: string | null
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_feed: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          mountain_id: number | null
          participant_ids: string[] | null
          plan_id: string | null
          shared_completion: boolean | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          mountain_id?: number | null
          participant_ids?: string[] | null
          plan_id?: string | null
          shared_completion?: boolean | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          mountain_id?: number | null
          participant_ids?: string[] | null
          plan_id?: string | null
          shared_completion?: boolean | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      activity_feed_participants: {
        Row: {
          activity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          activity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          activity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_participants_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_feed_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_verification_attempts: {
        Row: {
          created_at: string
          fail_reason: string | null
          id: string
          photo_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fail_reason?: string | null
          id?: string
          photo_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fail_reason?: string | null
          id?: string
          photo_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          alert_type: string | null
          category: string
          created_at: string | null
          date: string | null
          description: string | null
          full_description: string | null
          id: string
          is_active: boolean | null
          mountain_name: string | null
          severity: string | null
          source: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          alert_type?: string | null
          category: string
          created_at?: string | null
          date?: string | null
          description?: string | null
          full_description?: string | null
          id?: string
          is_active?: boolean | null
          mountain_name?: string | null
          severity?: string | null
          source?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          alert_type?: string | null
          category?: string
          created_at?: string | null
          date?: string | null
          description?: string | null
          full_description?: string | null
          id?: string
          is_active?: boolean | null
          mountain_name?: string | null
          severity?: string | null
          source?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bac100_mountains: {
        Row: {
          address: string | null
          bac_rank: number | null
          created_at: string
          height: number | null
          id: number
          is_active: boolean
          mountain_id: number | null
          name_ko: string
          region: string | null
          stamp_location: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bac_rank?: number | null
          created_at?: string
          height?: number | null
          id?: number
          is_active?: boolean
          mountain_id?: number | null
          name_ko: string
          region?: string | null
          stamp_location?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bac_rank?: number | null
          created_at?: string
          height?: number | null
          id?: number
          is_active?: boolean
          mountain_id?: number | null
          name_ko?: string
          region?: string | null
          stamp_location?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bac100_mountains_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          condition_type: string | null
          condition_value: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          xp_reward: number | null
        }
        Insert: {
          condition_type?: string | null
          condition_value?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          xp_reward?: number | null
        }
        Update: {
          condition_type?: string | null
          condition_value?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      challenges: {
        Row: {
          badge_id: string | null
          category: string | null
          category_group: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          goal_type: string | null
          goal_value: number | null
          id: string
          level: string | null
          start_date: string | null
          title: string
          type: string | null
        }
        Insert: {
          badge_id?: string | null
          category?: string | null
          category_group?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          goal_type?: string | null
          goal_value?: number | null
          id?: string
          level?: string | null
          start_date?: string | null
          title: string
          type?: string | null
        }
        Update: {
          badge_id?: string | null
          category?: string | null
          category_group?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          goal_type?: string | null
          goal_value?: number | null
          id?: string
          level?: string | null
          start_date?: string | null
          title?: string
          type?: string | null
        }
        Relationships: []
      }
      climbs: {
        Row: {
          climbed_at: string | null
          created_at: string | null
          id: number
          mountain_id: number | null
          note: string | null
          photo_url: string | null
          user_id: string | null
        }
        Insert: {
          climbed_at?: string | null
          created_at?: string | null
          id?: never
          mountain_id?: number | null
          note?: string | null
          photo_url?: string | null
          user_id?: string | null
        }
        Update: {
          climbed_at?: string | null
          created_at?: string | null
          id?: never
          mountain_id?: number | null
          note?: string | null
          photo_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "climbs_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "climbs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      club_messages: {
        Row: {
          club_id: string
          created_at: string | null
          id: string
          image_url: string | null
          message: string | null
          reply_to_id: string | null
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          message?: string | null
          reply_to_id?: string | null
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          message?: string | null
          reply_to_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "club_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "club_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string | null
          status: string | null
          template_name: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string | null
          status?: string | null
          template_name?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string | null
          status?: string | null
          template_name?: string | null
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number | null
          batch_size: number | null
          id: number
          retry_after_until: string | null
          send_delay_ms: number | null
          transactional_email_ttl_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          auth_email_ttl_minutes?: number | null
          batch_size?: number | null
          id: number
          retry_after_until?: string | null
          send_delay_ms?: number | null
          transactional_email_ttl_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          auth_email_ttl_minutes?: number | null
          batch_size?: number | null
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number | null
          transactional_email_ttl_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string | null
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      forestry_sync_log: {
        Row: {
          completed_at: string | null
          error_message: string | null
          forestry_code: string | null
          id: string
          mountain_id: number | null
          records_fetched: number | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          forestry_code?: string | null
          id?: string
          mountain_id?: number | null
          records_fetched?: number | null
          started_at?: string | null
          status?: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          forestry_code?: string | null
          id?: string
          mountain_id?: number | null
          records_fetched?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string | null
          id: string
          requester_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          addressee_id: string
          created_at?: string | null
          id?: string
          requester_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          addressee_id?: string
          created_at?: string | null
          id?: string
          requester_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gpx_sync_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: number
          mountain_id: number | null
          point_count: number | null
          raw_response: Json | null
          source: string
          status: string
          trail_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          mountain_id?: number | null
          point_count?: number | null
          raw_response?: Json | null
          source: string
          status: string
          trail_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          mountain_id?: number | null
          point_count?: number | null
          raw_response?: Json | null
          source?: string
          status?: string
          trail_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gpx_sync_log_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invitations: {
        Row: {
          created_at: string | null
          group_id: string
          id: string
          invitee_id: string
          inviter_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          group_id: string
          id?: string
          invitee_id: string
          inviter_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          group_id?: string
          id?: string
          invitee_id?: string
          inviter_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hiking_center_peaks: {
        Row: {
          elevation_gain_m: number | null
          end_lat: number | null
          end_lng: number | null
          end_place_name: string | null
          endpoints_matched_at: string | null
          gpx_filename: string | null
          id: number
          imported_at: string | null
          kakao_category: string | null
          kakao_distance_m: number | null
          kakao_matched_at: string | null
          kakao_nearby_places: Json | null
          kakao_place_id: string | null
          kakao_place_name: string | null
          max_elevation_m: number | null
          min_elevation_m: number | null
          peak_name: string
          peak_name_normalized: string | null
          route_coordinates: Json | null
          source: string | null
          start_lat: number | null
          start_lng: number | null
          start_place_name: string | null
          summit_elevation_m: number | null
          summit_lat: number
          summit_lng: number
          summit_name: string | null
          total_distance_m: number | null
          total_points: number | null
          trail_name: string | null
        }
        Insert: {
          elevation_gain_m?: number | null
          end_lat?: number | null
          end_lng?: number | null
          end_place_name?: string | null
          endpoints_matched_at?: string | null
          gpx_filename?: string | null
          id?: number
          imported_at?: string | null
          kakao_category?: string | null
          kakao_distance_m?: number | null
          kakao_matched_at?: string | null
          kakao_nearby_places?: Json | null
          kakao_place_id?: string | null
          kakao_place_name?: string | null
          max_elevation_m?: number | null
          min_elevation_m?: number | null
          peak_name: string
          peak_name_normalized?: string | null
          route_coordinates?: Json | null
          source?: string | null
          start_lat?: number | null
          start_lng?: number | null
          start_place_name?: string | null
          summit_elevation_m?: number | null
          summit_lat: number
          summit_lng: number
          summit_name?: string | null
          total_distance_m?: number | null
          total_points?: number | null
          trail_name?: string | null
        }
        Update: {
          elevation_gain_m?: number | null
          end_lat?: number | null
          end_lng?: number | null
          end_place_name?: string | null
          endpoints_matched_at?: string | null
          gpx_filename?: string | null
          id?: number
          imported_at?: string | null
          kakao_category?: string | null
          kakao_distance_m?: number | null
          kakao_matched_at?: string | null
          kakao_nearby_places?: Json | null
          kakao_place_id?: string | null
          kakao_place_name?: string | null
          max_elevation_m?: number | null
          min_elevation_m?: number | null
          peak_name?: string
          peak_name_normalized?: string | null
          route_coordinates?: Json | null
          source?: string | null
          start_lat?: number | null
          start_lng?: number | null
          start_place_name?: string | null
          summit_elevation_m?: number | null
          summit_lat?: number
          summit_lng?: number
          summit_name?: string | null
          total_distance_m?: number | null
          total_points?: number | null
          trail_name?: string | null
        }
        Relationships: []
      }
      hiking_group: {
        Row: {
          avatar_url: string | null
          cover_image_url: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          representative_mountain_id: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          representative_mountain_id?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          representative_mountain_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_group_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_group_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "hiking_group_representative_mountain_id_fkey"
            columns: ["representative_mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      hiking_journals: {
        Row: {
          course_name: string | null
          course_notes: string | null
          course_starting_point: string | null
          created_at: string | null
          difficulty: string | null
          duration: string | null
          hiked_at: string | null
          id: string
          mountain_id: number | null
          mountain_ids: number[] | null
          notes: string | null
          photos: string[] | null
          plan_id: string | null
          tagged_friends: string[] | null
          updated_at: string | null
          user_id: string
          visibility: string | null
          weather: string | null
        }
        Insert: {
          course_name?: string | null
          course_notes?: string | null
          course_starting_point?: string | null
          created_at?: string | null
          difficulty?: string | null
          duration?: string | null
          hiked_at?: string | null
          id?: string
          mountain_id?: number | null
          mountain_ids?: number[] | null
          notes?: string | null
          photos?: string[] | null
          plan_id?: string | null
          tagged_friends?: string[] | null
          updated_at?: string | null
          user_id: string
          visibility?: string | null
          weather?: string | null
        }
        Update: {
          course_name?: string | null
          course_notes?: string | null
          course_starting_point?: string | null
          created_at?: string | null
          difficulty?: string | null
          duration?: string | null
          hiked_at?: string | null
          id?: string
          mountain_id?: number | null
          mountain_ids?: number[] | null
          notes?: string | null
          photos?: string[] | null
          plan_id?: string | null
          tagged_friends?: string[] | null
          updated_at?: string | null
          user_id?: string
          visibility?: string | null
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hiking_journals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hiking_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      hiking_plans: {
        Row: {
          created_at: string | null
          creator_id: string
          estimated_distance_km: number | null
          estimated_duration_minutes: number | null
          group_id: string | null
          id: string
          is_public: boolean | null
          max_participants: number | null
          meeting_location: string | null
          mountain_id: number | null
          notes: string | null
          planned_date: string | null
          route_notes: string | null
          start_time: string | null
          status: string | null
          trail_id: string | null
          trail_name: string | null
          updated_at: string | null
          waypoints: Json | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string
          estimated_distance_km?: number | null
          estimated_duration_minutes?: number | null
          group_id?: string | null
          id?: string
          is_public?: boolean | null
          max_participants?: number | null
          meeting_location?: string | null
          mountain_id?: number | null
          notes?: string | null
          planned_date?: string | null
          route_notes?: string | null
          start_time?: string | null
          status?: string | null
          trail_id?: string | null
          trail_name?: string | null
          updated_at?: string | null
          waypoints?: Json | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          estimated_distance_km?: number | null
          estimated_duration_minutes?: number | null
          group_id?: string | null
          id?: string
          is_public?: boolean | null
          max_participants?: number | null
          meeting_location?: string | null
          mountain_id?: number | null
          notes?: string | null
          planned_date?: string | null
          route_notes?: string | null
          start_time?: string | null
          status?: string | null
          trail_id?: string | null
          trail_name?: string | null
          updated_at?: string | null
          waypoints?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_plan_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_plan_group"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "hiking_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hiking_plans_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      home_messages: {
        Row: {
          condition: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          message: string
          season: string | null
          time_of_day: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          season?: string | null
          time_of_day?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          season?: string | null
          time_of_day?: string | null
        }
        Relationships: []
      }
      journal_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          journal_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          journal_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          journal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_comment_journal"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "hiking_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_comment_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_comment_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      journal_likes: {
        Row: {
          created_at: string | null
          id: string
          journal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          journal_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          journal_id?: string
          user_id?: string
        }
        Relationships: []
      }
      magazine_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "magazine_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "magazine_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      magazine_posts: {
        Row: {
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "magazine_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "magazine_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      magazine_saves: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "magazine_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "magazine_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "magazine_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "magazine_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      magazine_slides: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          post_id: string
          slide_order: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          post_id: string
          slide_order?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          post_id?: string
          slide_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "magazine_slides_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "magazine_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "club_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      message_reads: {
        Row: {
          club_id: string
          id: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mountain_duplicate_reports: {
        Row: {
          created_at: string | null
          existing_mountain_id: string
          id: string
          reported_by: string
          reported_mountain_id: string
        }
        Insert: {
          created_at?: string | null
          existing_mountain_id: string
          id?: string
          reported_by: string
          reported_mountain_id: string
        }
        Update: {
          created_at?: string | null
          existing_mountain_id?: string
          id?: string
          reported_by?: string
          reported_mountain_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mountain_duplicate_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mountain_duplicate_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mountain_facilities: {
        Row: {
          created_at: string | null
          description: string | null
          facility_type: string
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          mountain_id: number
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          facility_type: string
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          mountain_id: number
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          facility_type?: string
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          mountain_id?: number
          name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mountain_facilities_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      mountain_trail_features: {
        Row: {
          created_at: string | null
          feature_count: number | null
          mountain_id: number
          synced_at: string | null
          total_length_m: number | null
          updated_at: string | null
          vworld_features: Json
        }
        Insert: {
          created_at?: string | null
          feature_count?: number | null
          mountain_id: number
          synced_at?: string | null
          total_length_m?: number | null
          updated_at?: string | null
          vworld_features?: Json
        }
        Update: {
          created_at?: string | null
          feature_count?: number | null
          mountain_id?: number
          synced_at?: string | null
          total_length_m?: number | null
          updated_at?: string | null
          vworld_features?: Json
        }
        Relationships: [
          {
            foreignKeyName: "mountain_trail_features_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: true
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      mountains: {
        Row: {
          address: string | null
          bac100_label: string | null
          bac100_rank: number | null
          created_at: string | null
          description: string | null
          designated_date: string | null
          difficulty: string | null
          feature: string | null
          forestry_code: string | null
          forestry_synced_at: string | null
          height: number | null
          homepage_url: string | null
          id: number
          image_credit: string | null
          image_license: string | null
          image_position: string | null
          image_url: string | null
          is_bac100: boolean | null
          is_bac100_blackyak: boolean
          is_national_park: boolean | null
          is_oreum: boolean | null
          lat: number | null
          lng: number | null
          name: string | null
          name_ko: string | null
          national_park_name: string | null
          overview: string | null
          parking_info: string | null
          popularity: number | null
          province: string | null
          region: string | null
          total_area_ha: number | null
          transport_car: string | null
          transport_public: string | null
          transport_synced_at: string | null
          vworld_feature_count: number | null
          vworld_synced_at: string | null
          vworld_total_length_m: number | null
        }
        Insert: {
          address?: string | null
          bac100_label?: string | null
          bac100_rank?: number | null
          created_at?: string | null
          description?: string | null
          designated_date?: string | null
          difficulty?: string | null
          feature?: string | null
          forestry_code?: string | null
          forestry_synced_at?: string | null
          height?: number | null
          homepage_url?: string | null
          id: number
          image_credit?: string | null
          image_license?: string | null
          image_position?: string | null
          image_url?: string | null
          is_bac100?: boolean | null
          is_bac100_blackyak?: boolean
          is_national_park?: boolean | null
          is_oreum?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          name_ko?: string | null
          national_park_name?: string | null
          overview?: string | null
          parking_info?: string | null
          popularity?: number | null
          province?: string | null
          region?: string | null
          total_area_ha?: number | null
          transport_car?: string | null
          transport_public?: string | null
          transport_synced_at?: string | null
          vworld_feature_count?: number | null
          vworld_synced_at?: string | null
          vworld_total_length_m?: number | null
        }
        Update: {
          address?: string | null
          bac100_label?: string | null
          bac100_rank?: number | null
          created_at?: string | null
          description?: string | null
          designated_date?: string | null
          difficulty?: string | null
          feature?: string | null
          forestry_code?: string | null
          forestry_synced_at?: string | null
          height?: number | null
          homepage_url?: string | null
          id?: number
          image_credit?: string | null
          image_license?: string | null
          image_position?: string | null
          image_url?: string | null
          is_bac100?: boolean | null
          is_bac100_blackyak?: boolean
          is_national_park?: boolean | null
          is_oreum?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string | null
          name_ko?: string | null
          national_park_name?: string | null
          overview?: string | null
          parking_info?: string | null
          popularity?: number | null
          province?: string | null
          region?: string | null
          total_area_ha?: number | null
          transport_car?: string | null
          transport_public?: string | null
          transport_synced_at?: string | null
          vworld_feature_count?: number | null
          vworld_synced_at?: string | null
          vworld_total_length_m?: number | null
        }
        Relationships: []
      }
      national_park_courses: {
        Row: {
          cos_kor_nm: string
          cos_schdul: string | null
          created_at: string | null
          detail_cos: string | null
          detail_cos_no: number | null
          difficulty: string | null
          forward_minutes: number | null
          forward_tm: string | null
          id: number
          latitude: number | null
          leng: string | null
          leng_meters: number | null
          longitude: number | null
          mng_tel: string | null
          mountain_id: number | null
          nrprk_cd: string
          objt_id: string
          park_name: string
          raw_x: string | null
          raw_y: string | null
          shape_leng: number | null
          source: string | null
          updated_at: string | null
        }
        Insert: {
          cos_kor_nm: string
          cos_schdul?: string | null
          created_at?: string | null
          detail_cos?: string | null
          detail_cos_no?: number | null
          difficulty?: string | null
          forward_minutes?: number | null
          forward_tm?: string | null
          id?: number
          latitude?: number | null
          leng?: string | null
          leng_meters?: number | null
          longitude?: number | null
          mng_tel?: string | null
          mountain_id?: number | null
          nrprk_cd: string
          objt_id: string
          park_name: string
          raw_x?: string | null
          raw_y?: string | null
          shape_leng?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          cos_kor_nm?: string
          cos_schdul?: string | null
          created_at?: string | null
          detail_cos?: string | null
          detail_cos_no?: number | null
          difficulty?: string | null
          forward_minutes?: number | null
          forward_tm?: string | null
          id?: number
          latitude?: number | null
          leng?: string | null
          leng_meters?: number | null
          longitude?: number | null
          mng_tel?: string | null
          mountain_id?: number | null
          nrprk_cd?: string
          objt_id?: string
          park_name?: string
          raw_x?: string | null
          raw_y?: string | null
          shape_leng?: number | null
          source?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "national_park_courses_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      national_parks: {
        Row: {
          area_km2: number | null
          created_at: string
          designated_year: number | null
          headquarters: string | null
          id: number
          lat: number | null
          lng: number | null
          mountain_id: number | null
          name_ko: string
          overview: string | null
          tel: string | null
          website: string | null
          wms_synced_at: string | null
        }
        Insert: {
          area_km2?: number | null
          created_at?: string
          designated_year?: number | null
          headquarters?: string | null
          id?: number
          lat?: number | null
          lng?: number | null
          mountain_id?: number | null
          name_ko: string
          overview?: string | null
          tel?: string | null
          website?: string | null
          wms_synced_at?: string | null
        }
        Update: {
          area_km2?: number | null
          created_at?: string
          designated_year?: number | null
          headquarters?: string | null
          id?: number
          lat?: number | null
          lng?: number | null
          mountain_id?: number | null
          name_ko?: string
          overview?: string | null
          tel?: string | null
          website?: string | null
          wms_synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "national_parks_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          related_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          related_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          related_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      np_facilities: {
        Row: {
          capacity: number | null
          facility_name: string | null
          facility_type: string
          id: string
          lat: number | null
          lng: number | null
          memo: string | null
          national_park_id: number | null
          open_season: string | null
          reservation_url: string | null
          synced_at: string
          tel: string | null
          trail_code: string | null
          wms_feature_id: string | null
        }
        Insert: {
          capacity?: number | null
          facility_name?: string | null
          facility_type: string
          id?: string
          lat?: number | null
          lng?: number | null
          memo?: string | null
          national_park_id?: number | null
          open_season?: string | null
          reservation_url?: string | null
          synced_at?: string
          tel?: string | null
          trail_code?: string | null
          wms_feature_id?: string | null
        }
        Update: {
          capacity?: number | null
          facility_name?: string | null
          facility_type?: string
          id?: string
          lat?: number | null
          lng?: number | null
          memo?: string | null
          national_park_id?: number | null
          open_season?: string | null
          reservation_url?: string | null
          synced_at?: string
          tel?: string | null
          trail_code?: string | null
          wms_feature_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "np_facilities_national_park_id_fkey"
            columns: ["national_park_id"]
            isOneToOne: false
            referencedRelation: "national_parks"
            referencedColumns: ["id"]
          },
        ]
      }
      np_safety_zones: {
        Row: {
          danger_grade: number | null
          danger_type: string | null
          description: string | null
          geometry: Json | null
          id: string
          lat: number | null
          lng: number | null
          national_park_id: number | null
          synced_at: string
          wms_feature_id: string | null
          zone_name: string | null
        }
        Insert: {
          danger_grade?: number | null
          danger_type?: string | null
          description?: string | null
          geometry?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          national_park_id?: number | null
          synced_at?: string
          wms_feature_id?: string | null
          zone_name?: string | null
        }
        Update: {
          danger_grade?: number | null
          danger_type?: string | null
          description?: string | null
          geometry?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          national_park_id?: number | null
          synced_at?: string
          wms_feature_id?: string | null
          zone_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "np_safety_zones_national_park_id_fkey"
            columns: ["national_park_id"]
            isOneToOne: false
            referencedRelation: "national_parks"
            referencedColumns: ["id"]
          },
        ]
      }
      np_trail_restrictions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          national_park_id: number | null
          np_trail_id: string | null
          reason: string | null
          restriction_type: string
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          national_park_id?: number | null
          np_trail_id?: string | null
          reason?: string | null
          restriction_type: string
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          national_park_id?: number | null
          np_trail_id?: string | null
          reason?: string | null
          restriction_type?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "np_trail_restrictions_national_park_id_fkey"
            columns: ["national_park_id"]
            isOneToOne: false
            referencedRelation: "national_parks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "np_trail_restrictions_np_trail_id_fkey"
            columns: ["np_trail_id"]
            isOneToOne: false
            referencedRelation: "np_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      np_trails: {
        Row: {
          difficulty: string | null
          distance_m: number | null
          duration_min: number | null
          geometry: Json | null
          id: string
          is_restricted: boolean | null
          mountain_id: number | null
          national_park_id: number | null
          synced_at: string
          trail_code: string | null
          trail_name: string | null
          trail_type: string | null
          wms_feature_id: string | null
        }
        Insert: {
          difficulty?: string | null
          distance_m?: number | null
          duration_min?: number | null
          geometry?: Json | null
          id?: string
          is_restricted?: boolean | null
          mountain_id?: number | null
          national_park_id?: number | null
          synced_at?: string
          trail_code?: string | null
          trail_name?: string | null
          trail_type?: string | null
          wms_feature_id?: string | null
        }
        Update: {
          difficulty?: string | null
          distance_m?: number | null
          duration_min?: number | null
          geometry?: Json | null
          id?: string
          is_restricted?: boolean | null
          mountain_id?: number | null
          national_park_id?: number | null
          synced_at?: string
          trail_code?: string | null
          trail_name?: string | null
          trail_type?: string | null
          wms_feature_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "np_trails_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "np_trails_national_park_id_fkey"
            columns: ["national_park_id"]
            isOneToOne: false
            referencedRelation: "national_parks"
            referencedColumns: ["id"]
          },
        ]
      }
      osm_peaks: {
        Row: {
          elevation_m: number | null
          feature_type: string | null
          imported_at: string | null
          lat: number
          lng: number
          name: string
          name_en: string | null
          name_ko: string | null
          osm_node_id: number
          source_mountain_id: number | null
          tags: Json | null
        }
        Insert: {
          elevation_m?: number | null
          feature_type?: string | null
          imported_at?: string | null
          lat: number
          lng: number
          name: string
          name_en?: string | null
          name_ko?: string | null
          osm_node_id: number
          source_mountain_id?: number | null
          tags?: Json | null
        }
        Update: {
          elevation_m?: number | null
          feature_type?: string | null
          imported_at?: string | null
          lat?: number
          lng?: number
          name?: string
          name_en?: string | null
          name_ko?: string | null
          osm_node_id?: number
          source_mountain_id?: number | null
          tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "osm_peaks_source_mountain_id_fkey"
            columns: ["source_mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      osm_trail_segments: {
        Row: {
          access_restriction: string | null
          geometry: Json
          highway_type: string | null
          imported_at: string | null
          length_m: number | null
          mountain_id: number | null
          name: string | null
          name_en: string | null
          name_ko: string | null
          sac_scale: string | null
          source_mountain_id: number | null
          tags: Json | null
          way_id: number
        }
        Insert: {
          access_restriction?: string | null
          geometry: Json
          highway_type?: string | null
          imported_at?: string | null
          length_m?: number | null
          mountain_id?: number | null
          name?: string | null
          name_en?: string | null
          name_ko?: string | null
          sac_scale?: string | null
          source_mountain_id?: number | null
          tags?: Json | null
          way_id: number
        }
        Update: {
          access_restriction?: string | null
          geometry?: Json
          highway_type?: string | null
          imported_at?: string | null
          length_m?: number | null
          mountain_id?: number | null
          name?: string | null
          name_en?: string | null
          name_ko?: string | null
          sac_scale?: string | null
          source_mountain_id?: number | null
          tags?: Json | null
          way_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "osm_trail_segments_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          climb_id: number | null
          created_at: string | null
          file_path: string | null
          id: number
          mountain_id: number | null
          user_id: string | null
        }
        Insert: {
          caption?: string | null
          climb_id?: number | null
          created_at?: string | null
          file_path?: string | null
          id?: never
          mountain_id?: number | null
          user_id?: string | null
        }
        Update: {
          caption?: string | null
          climb_id?: number | null
          created_at?: string | null
          file_path?: string | null
          id?: never
          mountain_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_climb_id_fkey"
            columns: ["climb_id"]
            isOneToOne: false
            referencedRelation: "climbs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_applications: {
        Row: {
          created_at: string | null
          id: string
          plan_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plan_edit_history: {
        Row: {
          created_at: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          plan_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          plan_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          plan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_edit_plan"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hiking_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_plan_edit_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_plan_edit_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      plan_invitations: {
        Row: {
          created_at: string | null
          id: string
          invitee_id: string
          inviter_id: string
          plan_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invitee_id: string
          inviter_id: string
          plan_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invitee_id?: string
          inviter_id?: string
          plan_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_invitations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hiking_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          plan_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          plan_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          plan_id?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          notification_type: string | null
          plan_id: string
          scheduled_at: string | null
          sent: boolean | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string | null
          plan_id: string
          scheduled_at?: string | null
          sent?: boolean | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          notification_type?: string | null
          plan_id?: string
          scheduled_at?: string | null
          sent?: boolean | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_plan_notification_plan"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hiking_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_participants: {
        Row: {
          id: string
          invited_at: string | null
          invited_by: string | null
          plan_id: string
          responded_at: string | null
          rsvp_status: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          plan_id: string
          responded_at?: string | null
          rsvp_status?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          plan_id?: string
          responded_at?: string | null
          rsvp_status?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_participant_inviter"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_participant_inviter"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_participant_plan"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hiking_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_participant_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_participant_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      privacy_settings: {
        Row: {
          allow_friend_requests: boolean | null
          created_at: string | null
          id: string
          journal_visibility: string | null
          profile_visibility: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_friend_requests?: boolean | null
          created_at?: string | null
          id?: string
          journal_visibility?: string | null
          profile_visibility?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_friend_requests?: boolean | null
          created_at?: string | null
          id?: string
          journal_visibility?: string | null
          profile_visibility?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_privacy_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_privacy_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          character_id: string | null
          character_level: number | null
          created_at: string | null
          email: string | null
          hiking_styles: string[] | null
          id: string
          is_active: boolean | null
          is_onboarded: boolean | null
          last_app_visit: string | null
          last_comforted_at: string | null
          location: string | null
          nickname: string | null
          provider: string | null
          role: string | null
          total_comfort_count: number | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          character_id?: string | null
          character_level?: number | null
          created_at?: string | null
          email?: string | null
          hiking_styles?: string[] | null
          id?: string
          is_active?: boolean | null
          is_onboarded?: boolean | null
          last_app_visit?: string | null
          last_comforted_at?: string | null
          location?: string | null
          nickname?: string | null
          provider?: string | null
          role?: string | null
          total_comfort_count?: number | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          character_id?: string | null
          character_level?: number | null
          created_at?: string | null
          email?: string | null
          hiking_styles?: string[] | null
          id?: string
          is_active?: boolean | null
          is_onboarded?: boolean | null
          last_app_visit?: string | null
          last_comforted_at?: string | null
          location?: string | null
          nickname?: string | null
          provider?: string | null
          role?: string | null
          total_comfort_count?: number | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          hiking_styles: string[] | null
          is_active: boolean | null
          location: string | null
          nickname: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          hiking_styles?: string[] | null
          is_active?: boolean | null
          location?: string | null
          nickname?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          hiking_styles?: string[] | null
          is_active?: boolean | null
          location?: string | null
          nickname?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reason: string | null
          reporter_id: string | null
          status: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string | null
          reporter_id?: string | null
          status?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string | null
          reporter_id?: string | null
          status?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      shared_completion: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string
          group_id: string | null
          id: string
          mountain_id: number | null
          plan_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          group_id?: string | null
          id?: string
          mountain_id?: number | null
          plan_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          group_id?: string | null
          id?: string
          mountain_id?: number | null
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_shared_completion_group"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "hiking_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_shared_completion_plan"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "hiking_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_shared_completion_user"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_shared_completion_user"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      shared_completion_participants: {
        Row: {
          id: string
          shared_completion_id: string
          user_id: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          id?: string
          shared_completion_id: string
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          id?: string
          shared_completion_id?: string
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_shared_completion"
            columns: ["shared_completion_id"]
            isOneToOne: false
            referencedRelation: "shared_completion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_shared_completion_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_shared_completion_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      summit_claims: {
        Row: {
          ai_confidence: number | null
          ai_verified: boolean | null
          claimed_at: string
          created_at: string | null
          group_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          mountain_id: number
          photo_url: string | null
          record_id: string | null
          source: string | null
          summit_id: string | null
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_verified?: boolean | null
          claimed_at?: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mountain_id: number
          photo_url?: string | null
          record_id?: string | null
          source?: string | null
          summit_id?: string | null
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_verified?: boolean | null
          claimed_at?: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mountain_id?: number
          photo_url?: string | null
          record_id?: string | null
          source?: string | null
          summit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "summit_claims_summit_id_fkey"
            columns: ["summit_id"]
            isOneToOne: false
            referencedRelation: "summits"
            referencedColumns: ["id"]
          },
        ]
      }
      summits: {
        Row: {
          created_at: string | null
          elevation: number
          id: string
          latitude: number
          longitude: number
          mountain_id: number
          summit_name: string
        }
        Insert: {
          created_at?: string | null
          elevation?: number
          id?: string
          latitude: number
          longitude: number
          mountain_id: number
          summit_name: string
        }
        Update: {
          created_at?: string | null
          elevation?: number
          id?: string
          latitude?: number
          longitude?: number
          mountain_id?: number
          summit_name?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      trail_closures: {
        Row: {
          closure_type: string | null
          created_at: string | null
          end_date: string | null
          forestry_code: string | null
          id: string
          is_active: boolean | null
          mountain_id: number | null
          reason: string | null
          source: string | null
          start_date: string | null
          trail_id: string | null
          updated_at: string | null
        }
        Insert: {
          closure_type?: string | null
          created_at?: string | null
          end_date?: string | null
          forestry_code?: string | null
          id?: string
          is_active?: boolean | null
          mountain_id?: number | null
          reason?: string | null
          source?: string | null
          start_date?: string | null
          trail_id?: string | null
          updated_at?: string | null
        }
        Update: {
          closure_type?: string | null
          created_at?: string | null
          end_date?: string | null
          forestry_code?: string | null
          id?: string
          is_active?: boolean | null
          mountain_id?: number | null
          reason?: string | null
          source?: string | null
          start_date?: string | null
          trail_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trail_closures_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_closures_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_coordinates: {
        Row: {
          created_at: string | null
          elevation_m: number | null
          id: string
          latitude: number
          longitude: number
          sequence_no: number
          trail_id: string
        }
        Insert: {
          created_at?: string | null
          elevation_m?: number | null
          id?: string
          latitude: number
          longitude: number
          sequence_no: number
          trail_id: string
        }
        Update: {
          created_at?: string | null
          elevation_m?: number | null
          id?: string
          latitude?: number
          longitude?: number
          sequence_no?: number
          trail_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_coordinates_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_safety_spots: {
        Row: {
          detail: string | null
          elevation_m: number | null
          id: number
          imported_at: string | null
          latitude: number
          longitude: number
          mntn_code: string | null
          mountain_id: number | null
          source: string | null
          source_id: string | null
          spot_type: string
        }
        Insert: {
          detail?: string | null
          elevation_m?: number | null
          id?: number
          imported_at?: string | null
          latitude: number
          longitude: number
          mntn_code?: string | null
          mountain_id?: number | null
          source?: string | null
          source_id?: string | null
          spot_type: string
        }
        Update: {
          detail?: string | null
          elevation_m?: number | null
          id?: number
          imported_at?: string | null
          latitude?: number
          longitude?: number
          mntn_code?: string | null
          mountain_id?: number | null
          source?: string | null
          source_id?: string | null
          spot_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_safety_spots_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_starting_points_geocoded: {
        Row: {
          address: string | null
          distance_from_mountain_km: number | null
          geocoded_at: string | null
          geocoder: string | null
          place_category: string | null
          place_name: string | null
          query_used: string | null
          starting_lat: number
          starting_lng: number
          trail_id: string
        }
        Insert: {
          address?: string | null
          distance_from_mountain_km?: number | null
          geocoded_at?: string | null
          geocoder?: string | null
          place_category?: string | null
          place_name?: string | null
          query_used?: string | null
          starting_lat: number
          starting_lng: number
          trail_id: string
        }
        Update: {
          address?: string | null
          distance_from_mountain_km?: number | null
          geocoded_at?: string | null
          geocoder?: string | null
          place_category?: string | null
          place_name?: string | null
          query_used?: string | null
          starting_lat?: number
          starting_lng?: number
          trail_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_starting_points_geocoded_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: true
            referencedRelation: "trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trails: {
        Row: {
          coords_synced_at: string | null
          course_type: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          distance_km: number | null
          distance_m: number | null
          down_minutes: number | null
          duration_minutes: number | null
          elevation_gain_m: number | null
          end_lat: number | null
          end_lng: number | null
          ending_point: string | null
          forestry_course_code: string | null
          forestry_synced_at: string | null
          geometry: Json | null
          gpx_point_count: number | null
          gpx_quality: string | null
          gpx_source: string | null
          gpx_synced_at: string | null
          hiking_center_peak_id: number | null
          hiking_tips: string | null
          id: string
          is_popular: boolean | null
          match_confidence: string | null
          match_score: number | null
          mountain_id: number
          name: string
          national_park_course_id: number | null
          parking_info: string | null
          route_segments: Json | null
          start_lat: number | null
          start_lng: number | null
          starting_point: string | null
          transport_car: string | null
          transport_public: string | null
          up_minutes_vw: number | null
          vworld_id: string | null
          vworld_match_confidence: string | null
          vworld_matched_feature_id: string | null
          vworld_synced_at: string | null
          waypoints: string | null
          waypoints_json: Json | null
        }
        Insert: {
          coords_synced_at?: string | null
          course_type?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          distance_km?: number | null
          distance_m?: number | null
          down_minutes?: number | null
          duration_minutes?: number | null
          elevation_gain_m?: number | null
          end_lat?: number | null
          end_lng?: number | null
          ending_point?: string | null
          forestry_course_code?: string | null
          forestry_synced_at?: string | null
          geometry?: Json | null
          gpx_point_count?: number | null
          gpx_quality?: string | null
          gpx_source?: string | null
          gpx_synced_at?: string | null
          hiking_center_peak_id?: number | null
          hiking_tips?: string | null
          id?: string
          is_popular?: boolean | null
          match_confidence?: string | null
          match_score?: number | null
          mountain_id: number
          name: string
          national_park_course_id?: number | null
          parking_info?: string | null
          route_segments?: Json | null
          start_lat?: number | null
          start_lng?: number | null
          starting_point?: string | null
          transport_car?: string | null
          transport_public?: string | null
          up_minutes_vw?: number | null
          vworld_id?: string | null
          vworld_match_confidence?: string | null
          vworld_matched_feature_id?: string | null
          vworld_synced_at?: string | null
          waypoints?: string | null
          waypoints_json?: Json | null
        }
        Update: {
          coords_synced_at?: string | null
          course_type?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          distance_km?: number | null
          distance_m?: number | null
          down_minutes?: number | null
          duration_minutes?: number | null
          elevation_gain_m?: number | null
          end_lat?: number | null
          end_lng?: number | null
          ending_point?: string | null
          forestry_course_code?: string | null
          forestry_synced_at?: string | null
          geometry?: Json | null
          gpx_point_count?: number | null
          gpx_quality?: string | null
          gpx_source?: string | null
          gpx_synced_at?: string | null
          hiking_center_peak_id?: number | null
          hiking_tips?: string | null
          id?: string
          is_popular?: boolean | null
          match_confidence?: string | null
          match_score?: number | null
          mountain_id?: number
          name?: string
          national_park_course_id?: number | null
          parking_info?: string | null
          route_segments?: Json | null
          start_lat?: number | null
          start_lng?: number | null
          starting_point?: string | null
          transport_car?: string | null
          transport_public?: string | null
          up_minutes_vw?: number | null
          vworld_id?: string | null
          vworld_match_confidence?: string | null
          vworld_matched_feature_id?: string | null
          vworld_synced_at?: string | null
          waypoints?: string | null
          waypoints_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_trail_mountain"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trails_hiking_center_peak_id_fkey"
            columns: ["hiking_center_peak_id"]
            isOneToOne: false
            referencedRelation: "hiking_center_peaks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trails_national_park_course_id_fkey"
            columns: ["national_park_course_id"]
            isOneToOne: false
            referencedRelation: "national_park_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      trails_name_backup: {
        Row: {
          backed_up_at: string | null
          id: string | null
          old_name: string | null
        }
        Insert: {
          backed_up_at?: string | null
          id?: string | null
          old_name?: string | null
        }
        Update: {
          backed_up_at?: string | null
          id?: string | null
          old_name?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          abandon_reason: string | null
          abandoned_at: string | null
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          current_level: number | null
          current_level_completed: boolean | null
          current_level_progress: number | null
          id: string
          joined_at: string | null
          progress: number | null
          user_id: string
        }
        Insert: {
          abandon_reason?: string | null
          abandoned_at?: string | null
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          current_level?: number | null
          current_level_completed?: boolean | null
          current_level_progress?: number | null
          id?: string
          joined_at?: string | null
          progress?: number | null
          user_id: string
        }
        Update: {
          abandon_reason?: string | null
          abandoned_at?: string | null
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          current_level?: number | null
          current_level_completed?: boolean | null
          current_level_progress?: number | null
          id?: string
          joined_at?: string | null
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_challenge_challenge"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_challenge_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_user_challenge_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_mountain_challenges: {
        Row: {
          bac100_id: number | null
          challenge_type: Database["public"]["Enums"]["challenge_list_type"]
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          mountain_id: number | null
          note: string | null
          photo_url: string | null
          summit_claim_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bac100_id?: number | null
          challenge_type: Database["public"]["Enums"]["challenge_list_type"]
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          mountain_id?: number | null
          note?: string | null
          photo_url?: string | null
          summit_claim_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bac100_id?: number | null
          challenge_type?: Database["public"]["Enums"]["challenge_list_type"]
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          mountain_id?: number | null
          note?: string | null
          photo_url?: string | null
          summit_claim_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mountain_challenges_bac100_id_fkey"
            columns: ["bac100_id"]
            isOneToOne: false
            referencedRelation: "bac100_mountains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mountain_challenges_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mountain_challenges_summit_claim_id_fkey"
            columns: ["summit_claim_id"]
            isOneToOne: false
            referencedRelation: "summit_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_mountain_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_mountain_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_mountains: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty: string | null
          height: number | null
          id: string
          image_url: string | null
          is_user_created: boolean | null
          lat: number | null
          lng: number | null
          mountain_id: number
          name: string | null
          name_ko: string | null
          region: string | null
          reject_reason: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_user_created?: boolean | null
          lat?: number | null
          lng?: number | null
          mountain_id: number
          name?: string | null
          name_ko?: string | null
          region?: string | null
          reject_reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_user_created?: boolean | null
          lat?: number | null
          lng?: number | null
          mountain_id?: number
          name?: string | null
          name_ko?: string | null
          region?: string | null
          reject_reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          nickname: string | null
          profile_image: string | null
          provider: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          is_active?: boolean | null
          nickname?: string | null
          profile_image?: string | null
          provider?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          nickname?: string | null
          profile_image?: string | null
          provider?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vworld_trail_segments: {
        Row: {
          difficulty: string | null
          down_min: number | null
          feature_id: string
          geometry: Json
          imported_at: string | null
          length_m: number | null
          mountain_id: number | null
          source_mountain_id: number | null
          up_min: number | null
          vworld_mountain_name: string
        }
        Insert: {
          difficulty?: string | null
          down_min?: number | null
          feature_id: string
          geometry: Json
          imported_at?: string | null
          length_m?: number | null
          mountain_id?: number | null
          source_mountain_id?: number | null
          up_min?: number | null
          vworld_mountain_name: string
        }
        Update: {
          difficulty?: string | null
          down_min?: number | null
          feature_id?: string
          geometry?: Json
          imported_at?: string | null
          length_m?: number | null
          mountain_id?: number | null
          source_mountain_id?: number | null
          up_min?: number | null
          vworld_mountain_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vworld_trail_segments_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      walking_path_courses: {
        Row: {
          course_name: string | null
          course_number: string
          created_at: string | null
          description: string | null
          difficulty: string | null
          distance_km: number | null
          duration_minutes: number | null
          end_point: string | null
          id: string
          start_point: string | null
          walking_path_id: string | null
        }
        Insert: {
          course_name?: string | null
          course_number: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          distance_km?: number | null
          duration_minutes?: number | null
          end_point?: string | null
          id?: string
          start_point?: string | null
          walking_path_id?: string | null
        }
        Update: {
          course_name?: string | null
          course_number?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          distance_km?: number | null
          duration_minutes?: number | null
          end_point?: string | null
          id?: string
          start_point?: string | null
          walking_path_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "walking_path_courses_walking_path_id_fkey"
            columns: ["walking_path_id"]
            isOneToOne: false
            referencedRelation: "walking_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      walking_paths: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          duration_hours: number | null
          end_point: string | null
          highlights: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          mountain_id: number | null
          name: string
          path_type: string
          province: string | null
          region: string | null
          start_point: string | null
          total_courses: number | null
          total_distance_km: number | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration_hours?: number | null
          end_point?: string | null
          highlights?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          mountain_id?: number | null
          name: string
          path_type: string
          province?: string | null
          region?: string | null
          start_point?: string | null
          total_courses?: number | null
          total_distance_km?: number | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration_hours?: number | null
          end_point?: string | null
          highlights?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          mountain_id?: number | null
          name?: string
          path_type?: string
          province?: string | null
          region?: string | null
          start_point?: string | null
          total_courses?: number | null
          total_distance_km?: number | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "walking_paths_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_code_map: {
        Row: {
          description: string | null
          id: number
          owm_code_max: number
          owm_code_min: number
          weather_key: string
        }
        Insert: {
          description?: string | null
          id?: number
          owm_code_max: number
          owm_code_min: number
          weather_key: string
        }
        Update: {
          description?: string | null
          id?: number
          owm_code_max?: number
          owm_code_min?: number
          weather_key?: string
        }
        Relationships: []
      }
      xp_log: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          source_id: string | null
          source_type: string
          user_id: string | null
          xp_amount: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type: string
          user_id?: string | null
          xp_amount: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          source_id?: string | null
          source_type?: string
          user_id?: string | null
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "xp_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      profiles_safe: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          hiking_styles: string[] | null
          id: string | null
          is_active: boolean | null
          location: string | null
          nickname: string | null
          provider: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          hiking_styles?: string[] | null
          id?: string | null
          is_active?: boolean | null
          location?: string | null
          nickname?: string | null
          provider?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          hiking_styles?: string[] | null
          id?: string | null
          is_active?: boolean | null
          location?: string | null
          nickname?: string | null
          provider?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_challenge_summary: {
        Row: {
          challenge_type:
            | Database["public"]["Enums"]["challenge_list_type"]
            | null
          completed_count: number | null
          first_completed_at: string | null
          last_completed_at: string | null
          total_attempted: number | null
          total_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_mountain_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_mountain_challenges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      achieve_badge: {
        Args: { p_badge_id: string; p_user_id: string }
        Returns: Json
      }
      add_xp: {
        Args: {
          p_amount: number
          p_description?: string
          p_source_id?: string
          p_source_type: string
          p_user_id: string
        }
        Returns: Json
      }
      calc_level: { Args: { xp_val: number }; Returns: number }
      calc_route_distance: { Args: { coords: Json }; Returns: number }
      can_access_group: {
        Args: { _group_id: string; _user_id?: string }
        Returns: boolean
      }
      can_access_journal: {
        Args: { _journal_id: string; _user_id?: string }
        Returns: boolean
      }
      can_access_plan: {
        Args: { _plan_id: string; _user_id?: string }
        Returns: boolean
      }
      coords_distance_m: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      get_mountain_name_ko: { Args: { p_mountain_id: number }; Returns: string }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      schedule_plan_notifications: {
        Args: { p_plan_id: string; p_user_id: string }
        Returns: undefined
      }
      toggle_summit_claim: { Args: { p_mountain_id: number }; Returns: Json }
    }
    Enums: {
      challenge_list_type: "forestry_100" | "bac_100"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      challenge_list_type: ["forestry_100", "bac_100"],
    },
  },
} as const
