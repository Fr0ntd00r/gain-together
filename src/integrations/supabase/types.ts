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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          criteria: Json | null
          description: string
          icon: string | null
          id: string
          name: string
          tier: string | null
        }
        Insert: {
          code: string
          criteria?: Json | null
          description: string
          icon?: string | null
          id?: string
          name: string
          tier?: string | null
        }
        Update: {
          code?: string
          criteria?: Json | null
          description?: string
          icon?: string | null
          id?: string
          name?: string
          tier?: string | null
        }
        Relationships: []
      }
      activity_feed: {
        Row: {
          created_at: string
          data: Json | null
          event_type: Database["public"]["Enums"]["feed_event_type"]
          id: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          event_type: Database["public"]["Enums"]["feed_event_type"]
          id?: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          event_type?: Database["public"]["Enums"]["feed_event_type"]
          id?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          current_value: number | null
          id: string
          is_completed: boolean | null
          joined_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          current_value?: number | null
          id?: string
          is_completed?: boolean | null
          joined_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          current_value?: number | null
          id?: string
          is_completed?: boolean | null
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          exercise_id: string | null
          id: string
          is_public: boolean | null
          metric: string
          name: string
          start_date: string
          target_value: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          exercise_id?: string | null
          id?: string
          is_public?: boolean | null
          metric: string
          name: string
          start_date: string
          target_value?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          exercise_id?: string | null
          id?: string
          is_public?: boolean | null
          metric?: string
          name?: string
          start_date?: string
          target_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_user_notes: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          image_url: string | null
          instructions: string | null
          setup_notes: string | null
          tips: string | null
          updated_at: string
          user_id: string
          weight_increment: number | null
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          image_url?: string | null
          instructions?: string | null
          setup_notes?: string | null
          tips?: string | null
          updated_at?: string
          user_id: string
          weight_increment?: number | null
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          image_url?: string | null
          instructions?: string | null
          setup_notes?: string | null
          tips?: string | null
          updated_at?: string
          user_id?: string
          weight_increment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_user_notes_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          equipment: Database["public"]["Enums"]["equipment_type"]
          id: string
          image_url: string | null
          instructions: string | null
          is_compound: boolean | null
          is_public: boolean | null
          name: string
          primary_muscle: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          setup_notes: string | null
          tips: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          equipment: Database["public"]["Enums"]["equipment_type"]
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_compound?: boolean | null
          is_public?: boolean | null
          name: string
          primary_muscle: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles?:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          setup_notes?: string | null
          tips?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          equipment?: Database["public"]["Enums"]["equipment_type"]
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_compound?: boolean | null
          is_public?: boolean | null
          name?: string
          primary_muscle?: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles?:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          setup_notes?: string | null
          tips?: string | null
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          feed_id: string
          id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          feed_id: string
          id?: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          feed_id?: string
          id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "activity_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_likes: {
        Row: {
          created_at: string
          feed_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feed_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_likes_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "activity_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["friendship_status"]
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["friendship_status"]
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          comment_id: string | null
          created_at: string
          feed_id: string | null
          id: string
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          feed_id?: string | null
          id?: string
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          comment_id?: string | null
          created_at?: string
          feed_id?: string | null
          id?: string
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_records: {
        Row: {
          achieved_at: string
          exercise_id: string
          id: string
          record_type: string
          reps: number | null
          user_id: string
          value: number
          weight: number | null
          workout_id: string | null
        }
        Insert: {
          achieved_at?: string
          exercise_id: string
          id?: string
          record_type: string
          reps?: number | null
          user_id: string
          value: number
          weight?: number | null
          workout_id?: string | null
        }
        Update: {
          achieved_at?: string
          exercise_id?: string
          id?: string
          record_type?: string
          reps?: number | null
          user_id?: string
          value?: number
          weight?: number | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_streak: number | null
          display_name: string | null
          experience: Database["public"]["Enums"]["experience_level"] | null
          goal: Database["public"]["Enums"]["fitness_goal"] | null
          id: string
          last_workout_date: string | null
          longest_streak: number | null
          updated_at: string
          username: string
          weight_unit: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number | null
          display_name?: string | null
          experience?: Database["public"]["Enums"]["experience_level"] | null
          goal?: Database["public"]["Enums"]["fitness_goal"] | null
          id: string
          last_workout_date?: string | null
          longest_streak?: number | null
          updated_at?: string
          username: string
          weight_unit?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_streak?: number | null
          display_name?: string | null
          experience?: Database["public"]["Enums"]["experience_level"] | null
          goal?: Database["public"]["Enums"]["fitness_goal"] | null
          id?: string
          last_workout_date?: string | null
          longest_streak?: number | null
          updated_at?: string
          username?: string
          weight_unit?: string | null
        }
        Relationships: []
      }
      schedule_rules: {
        Row: {
          id: string
          mode: string
          slot_index: number
          template_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          mode: string
          slot_index: number
          template_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          mode?: string
          slot_index?: number
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_settings: {
        Row: {
          anchor_date: string
          cycle_length: number
          mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anchor_date?: string
          cycle_length?: number
          mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anchor_date?: string
          cycle_length?: number
          mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_workouts: {
        Row: {
          created_at: string
          date: string
          id: string
          note: string | null
          status: string
          template_id: string | null
          updated_at: string
          user_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          note?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      template_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          position: number
          rest_seconds: number | null
          target_reps: number | null
          target_sets: number | null
          target_weight: number | null
          template_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          position?: number
          rest_seconds?: number | null
          target_reps?: number | null
          target_sets?: number | null
          target_weight?: number | null
          template_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          rest_seconds?: number | null
          target_reps?: number | null
          target_sets?: number | null
          target_weight?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_sets: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          is_completed: boolean | null
          is_warmup: boolean | null
          notes: string | null
          position: number
          reps: number | null
          rpe: number | null
          set_number: number
          user_id: string
          weight: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          is_completed?: boolean | null
          is_warmup?: boolean | null
          notes?: string | null
          position?: number
          reps?: number | null
          rpe?: number | null
          set_number?: number
          user_id: string
          weight?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          is_completed?: boolean | null
          is_warmup?: boolean | null
          notes?: string | null
          position?: number
          reps?: number | null
          rpe?: number | null
          set_number?: number
          user_id?: string
          weight?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["experience_level"] | null
          estimated_duration_min: number | null
          id: string
          is_official: boolean | null
          is_public: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["experience_level"] | null
          estimated_duration_min?: number | null
          id?: string
          is_official?: boolean | null
          is_public?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["experience_level"] | null
          estimated_duration_min?: number | null
          id?: string
          is_official?: boolean | null
          is_public?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          accumulated_seconds: number
          created_at: string
          duration_seconds: number | null
          finished_at: string | null
          id: string
          is_completed: boolean | null
          is_paused: boolean
          last_resumed_at: string | null
          name: string
          notes: string | null
          started_at: string
          template_id: string | null
          total_volume: number | null
          user_id: string
        }
        Insert: {
          accumulated_seconds?: number
          created_at?: string
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_paused?: boolean
          last_resumed_at?: string | null
          name?: string
          notes?: string | null
          started_at?: string
          template_id?: string | null
          total_volume?: number | null
          user_id: string
        }
        Update: {
          accumulated_seconds?: number
          created_at?: string
          duration_seconds?: number | null
          finished_at?: string | null
          id?: string
          is_completed?: boolean | null
          is_paused?: boolean
          last_resumed_at?: string | null
          name?: string
          notes?: string | null
          started_at?: string
          template_id?: string | null
          total_volume?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_friend: { Args: { _a: string; _b: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      equipment_type:
        | "barbell"
        | "dumbbell"
        | "machine"
        | "cable"
        | "bodyweight"
        | "kettlebell"
        | "bands"
        | "cardio_machine"
        | "other"
      experience_level: "beginner" | "intermediate" | "advanced"
      feed_event_type:
        | "workout_completed"
        | "personal_record"
        | "achievement_unlocked"
        | "challenge_joined"
        | "challenge_completed"
      fitness_goal:
        | "strength"
        | "hypertrophy"
        | "endurance"
        | "weight_loss"
        | "general_fitness"
      friendship_status: "pending" | "accepted" | "blocked"
      muscle_group:
        | "chest"
        | "back"
        | "shoulders"
        | "biceps"
        | "triceps"
        | "forearms"
        | "quads"
        | "hamstrings"
        | "glutes"
        | "calves"
        | "core"
        | "full_body"
        | "cardio"
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
      app_role: ["admin", "user"],
      equipment_type: [
        "barbell",
        "dumbbell",
        "machine",
        "cable",
        "bodyweight",
        "kettlebell",
        "bands",
        "cardio_machine",
        "other",
      ],
      experience_level: ["beginner", "intermediate", "advanced"],
      feed_event_type: [
        "workout_completed",
        "personal_record",
        "achievement_unlocked",
        "challenge_joined",
        "challenge_completed",
      ],
      fitness_goal: [
        "strength",
        "hypertrophy",
        "endurance",
        "weight_loss",
        "general_fitness",
      ],
      friendship_status: ["pending", "accepted", "blocked"],
      muscle_group: [
        "chest",
        "back",
        "shoulders",
        "biceps",
        "triceps",
        "forearms",
        "quads",
        "hamstrings",
        "glutes",
        "calves",
        "core",
        "full_body",
        "cardio",
      ],
    },
  },
} as const
