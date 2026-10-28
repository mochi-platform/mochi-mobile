
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "achievements": {
                  Row: {
                    "category": string,"created_at": string | null,"description": string,"icon": string,"id": string,"is_secret": boolean | null,"key": string,"points": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"created_at"?: string | null,"description": string,"icon": string,"id"?: string,"is_secret"?: boolean | null,"key": string,"points"?: number,"title": string
                  }
                  Update: {
                    "category"?: string,"created_at"?: string | null,"description"?: string,"icon"?: string,"id"?: string,"is_secret"?: boolean | null,"key"?: string,"points"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"action_conversions": {
                  Row: {
                    "ai_reasoning": string | null,"confidence_score": number,"converted_action_type": string,"converted_data": NonNullable<Json>,"created_at": string,"id": string,"original_note": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_reasoning"?: string | null,"confidence_score": number,"converted_action_type": string,"converted_data"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"original_note": string,"user_id": string
                  }
                  Update: {
                    "ai_reasoning"?: string | null,"confidence_score"?: number,"converted_action_type"?: string,"converted_data"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"original_note"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "action_conversions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_ad_rewards_daily": {
                  Row: {
                    "ad_network": string | null,"ad_unit_id": string | null,"created_at": string,"day_key": string,"id": string,"reward_event_id": string,"rewarded_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ad_network"?: string | null,"ad_unit_id"?: string | null,"created_at"?: string,"day_key": string,"id"?: string,"reward_event_id": string,"rewarded_at"?: string,"user_id": string
                  }
                  Update: {
                    "ad_network"?: string | null,"ad_unit_id"?: string | null,"created_at"?: string,"day_key"?: string,"id"?: string,"reward_event_id"?: string,"rewarded_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_ad_rewards_daily_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_cache": {
                  Row: {
                    "expires_at": string,"key": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "expires_at": string,"key": string,"value": NonNullable<Json>
                  }
                  Update: {
                    "expires_at"?: string,"key"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"ai_credits_ledger": {
                  Row: {
                    "created_at": string,"delta": number,"id": string,"metadata": NonNullable<Json>,"reason": string,"source_ref": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"delta": number,"id"?: string,"metadata"?: NonNullable<Json>,"reason": string,"source_ref"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"delta"?: number,"id"?: string,"metadata"?: NonNullable<Json>,"reason"?: string,"source_ref"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_credits_ledger_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_gateway_requests": {
                  Row: {
                    "created_at": string,"id": number,"model": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: number,"model"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: number,"model"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ai_usage_limits": {
                  Row: {
                    "daily_request_limit": number | null,"features": NonNullable<Json>,"id": string,"monthly_token_budget": number | null,"plan_key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "daily_request_limit"?: number | null,"features"?: NonNullable<Json>,"id"?: string,"monthly_token_budget"?: number | null,"plan_key": string,"updated_at"?: string
                  }
                  Update: {
                    "daily_request_limit"?: number | null,"features"?: NonNullable<Json>,"id"?: string,"monthly_token_budget"?: number | null,"plan_key"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"billing_events": {
                  Row: {
                    "event_id": string,"event_type": string,"id": string,"payload": NonNullable<Json>,"provider": string,"received_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "event_id": string,"event_type": string,"id"?: string,"payload"?: NonNullable<Json>,"provider": string,"received_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "event_id"?: string,"event_type"?: string,"id"?: string,"payload"?: NonNullable<Json>,"provider"?: string,"received_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "billing_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"billing_subscriptions": {
                  Row: {
                    "auto_renew": boolean,"current_period_ends_at": string | null,"current_period_started_at": string | null,"entitlement_id": string,"external_customer_id": string | null,"id": string,"product_id": string | null,"provider": string,"raw_payload": Json | null,"status": string,"store": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auto_renew"?: boolean,"current_period_ends_at"?: string | null,"current_period_started_at"?: string | null,"entitlement_id"?: string,"external_customer_id"?: string | null,"id"?: string,"product_id"?: string | null,"provider"?: string,"raw_payload"?: Json | null,"status"?: string,"store"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "auto_renew"?: boolean,"current_period_ends_at"?: string | null,"current_period_started_at"?: string | null,"entitlement_id"?: string,"external_customer_id"?: string | null,"id"?: string,"product_id"?: string | null,"provider"?: string,"raw_payload"?: Json | null,"status"?: string,"store"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "billing_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cycle_logs": {
                  Row: {
                    "created_at": string | null,"cycle_length": number | null,"id": string,"notes": string | null,"period_end_date": string | null,"period_start_date": string,"source": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"cycle_length"?: number | null,"id"?: string,"notes"?: string | null,"period_end_date"?: string | null,"period_start_date": string,"source"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"cycle_length"?: number | null,"id"?: string,"notes"?: string | null,"period_end_date"?: string | null,"period_start_date"?: string,"source"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cycle_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"energy_levels": {
                  Row: {
                    "created_at": string,"id": string,"logged_date": string,"notes": string | null,"overall_rating": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"logged_date": string,"notes"?: string | null,"overall_rating": number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"logged_date"?: string,"notes"?: string | null,"overall_rating"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "energy_levels_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"engagement_events": {
                  Row: {
                    "context": NonNullable<Json>,"dedupe_hits": number,"event_key": string,"event_name": string,"event_version": number,"id": string,"inserted_at": string,"occurred_at": string,"payload": NonNullable<Json>,"processed_at": string | null,"processing_error": string | null,"processing_status": string,"source_id": string | null,"source_table": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "context"?: NonNullable<Json>,"dedupe_hits"?: number,"event_key": string,"event_name": string,"event_version"?: number,"id"?: string,"inserted_at"?: string,"occurred_at"?: string,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"processing_error"?: string | null,"processing_status"?: string,"source_id"?: string | null,"source_table"?: string | null,"user_id": string
                  }
                  Update: {
                    "context"?: NonNullable<Json>,"dedupe_hits"?: number,"event_key"?: string,"event_name"?: string,"event_version"?: number,"id"?: string,"inserted_at"?: string,"occurred_at"?: string,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"processing_error"?: string | null,"processing_status"?: string,"source_id"?: string | null,"source_table"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "engagement_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"entitlement_grants": {
                  Row: {
                    "created_at": string,"entitlement": string,"expires_at": string | null,"granted_by": string | null,"id": string,"reason": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"entitlement": string,"expires_at"?: string | null,"granted_by"?: string | null,"id"?: string,"reason"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"entitlement"?: string,"expires_at"?: string | null,"granted_by"?: string | null,"id"?: string,"reason"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"exam_logs": {
                  Row: {
                    "created_at": string | null,"exam_date": string | null,"grade": number | null,"id": string,"is_upcoming": boolean | null,"max_grade": number | null,"notes": string | null,"preparation_notes": string | null,"subject": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"exam_date"?: string | null,"grade"?: number | null,"id"?: string,"is_upcoming"?: boolean | null,"max_grade"?: number | null,"notes"?: string | null,"preparation_notes"?: string | null,"subject": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"exam_date"?: string | null,"grade"?: number | null,"id"?: string,"is_upcoming"?: boolean | null,"max_grade"?: number | null,"notes"?: string | null,"preparation_notes"?: string | null,"subject"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exam_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"exam_prep_sprints": {
                  Row: {
                    "created_at": string,"daily_target_hours": number,"end_date": string,"exam_id": string,"id": string,"start_date": string,"target_grade": number | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"daily_target_hours": number,"end_date": string,"exam_id": string,"id"?: string,"start_date": string,"target_grade"?: number | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"daily_target_hours"?: number,"end_date"?: string,"exam_id"?: string,"id"?: string,"start_date"?: string,"target_grade"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exam_prep_sprints_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"exam_sprint_milestones": {
                  Row: {
                    "description": string,"id": string,"is_completed": boolean,"milestone_number": number,"sprint_id": string,"target_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"id"?: string,"is_completed"?: boolean,"milestone_number": number,"sprint_id": string,"target_date": string
                  }
                  Update: {
                    "description"?: string,"id"?: string,"is_completed"?: boolean,"milestone_number"?: number,"sprint_id"?: string,"target_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exam_sprint_milestones_sprint_id_fkey"
      columns: ["sprint_id"]
isOneToOne: false
      referencedRelation: "exam_prep_sprints"
      referencedColumns: ["id"]
    }
                  ]
                },"exam_sprint_progress": {
                  Row: {
                    "created_at": string,"hours_studied": number,"id": string,"is_day_completed": boolean,"mood_rating": number | null,"notes": string | null,"progress_date": string,"sprint_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"hours_studied": number,"id"?: string,"is_day_completed"?: boolean,"mood_rating"?: number | null,"notes"?: string | null,"progress_date": string,"sprint_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"hours_studied"?: number,"id"?: string,"is_day_completed"?: boolean,"mood_rating"?: number | null,"notes"?: string | null,"progress_date"?: string,"sprint_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exam_sprint_progress_sprint_id_fkey"
      columns: ["sprint_id"]
isOneToOne: false
      referencedRelation: "exam_prep_sprints"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exam_sprint_progress_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "created_at": string | null,"duration_seconds": number | null,"id": string,"name": string,"notes": string | null,"reps": number | null,"sets": number | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"duration_seconds"?: number | null,"id"?: string,"name": string,"notes"?: string | null,"reps"?: number | null,"sets"?: number | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"duration_seconds"?: number | null,"id"?: string,"name"?: string,"notes"?: string | null,"reps"?: number | null,"sets"?: number | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercises_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"flashcard_decks": {
                  Row: {
                    "created_at": string | null,"id": string,"study_session_id": string | null,"subject": string,"topic": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"study_session_id"?: string | null,"subject": string,"topic": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"study_session_id"?: string | null,"subject"?: string,"topic"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "flashcard_decks_study_session_id_fkey"
      columns: ["study_session_id"]
isOneToOne: false
      referencedRelation: "study_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "flashcard_decks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"flashcards": {
                  Row: {
                    "back": string,"deck_id": string | null,"difficulty_rating": number | null,"due_at": string,"ease_factor": number,"front": string,"id": string,"interval_days": number,"last_reviewed_at": string | null,"repetitions": number,"review_count": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "back": string,"deck_id"?: string | null,"difficulty_rating"?: number | null,"due_at"?: string,"ease_factor"?: number,"front": string,"id"?: string,"interval_days"?: number,"last_reviewed_at"?: string | null,"repetitions"?: number,"review_count"?: number | null
                  }
                  Update: {
                    "back"?: string,"deck_id"?: string | null,"difficulty_rating"?: number | null,"due_at"?: string,"ease_factor"?: number,"front"?: string,"id"?: string,"interval_days"?: number,"last_reviewed_at"?: string | null,"repetitions"?: number,"review_count"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "flashcards_deck_id_fkey"
      columns: ["deck_id"]
isOneToOne: false
      referencedRelation: "flashcard_decks"
      referencedColumns: ["id"]
    }
                  ]
                },"goals": {
                  Row: {
                    "color": string | null,"created_at": string | null,"description": string | null,"id": string,"is_completed": boolean | null,"progress": number | null,"target_date": string | null,"title": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string | null,"created_at"?: string | null,"description"?: string | null,"id"?: string,"is_completed"?: boolean | null,"progress"?: number | null,"target_date"?: string | null,"title": string,"user_id"?: string | null
                  }
                  Update: {
                    "color"?: string | null,"created_at"?: string | null,"description"?: string | null,"id"?: string,"is_completed"?: boolean | null,"progress"?: number | null,"target_date"?: string | null,"title"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "goals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gratitude_logs": {
                  Row: {
                    "created_at": string | null,"entry_1": string,"entry_2": string | null,"entry_3": string | null,"id": string,"logged_date": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"entry_1": string,"entry_2"?: string | null,"entry_3"?: string | null,"id"?: string,"logged_date"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"entry_1"?: string,"entry_2"?: string | null,"entry_3"?: string | null,"id"?: string,"logged_date"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gratitude_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"habit_logs": {
                  Row: {
                    "habit_id": string | null,"id": string,"log_date": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "habit_id"?: string | null,"id"?: string,"log_date"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "habit_id"?: string | null,"id"?: string,"log_date"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "habit_logs_habit_id_fkey"
      columns: ["habit_id"]
isOneToOne: false
      referencedRelation: "habits"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "habit_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"habits": {
                  Row: {
                    "color": string,"created_at": string | null,"icon": string,"id": string,"is_active": boolean | null,"name": string,"reminder_enabled": boolean,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string | null,"icon"?: string,"id"?: string,"is_active"?: boolean | null,"name": string,"reminder_enabled"?: boolean,"user_id"?: string | null
                  }
                  Update: {
                    "color"?: string,"created_at"?: string | null,"icon"?: string,"id"?: string,"is_active"?: boolean | null,"name"?: string,"reminder_enabled"?: boolean,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "habits_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"joint_goals": {
                  Row: {
                    "created_at": string,"created_by": string,"description": string | null,"id": string,"is_completed": boolean,"progress": number,"space_id": string,"target_date": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"description"?: string | null,"id"?: string,"is_completed"?: boolean,"progress"?: number,"space_id": string,"target_date"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"description"?: string | null,"id"?: string,"is_completed"?: boolean,"progress"?: number,"space_id"?: string,"target_date"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "joint_goals_space_id_fkey"
      columns: ["space_id"]
isOneToOne: false
      referencedRelation: "partner_spaces"
      referencedColumns: ["id"]
    }
                  ]
                },"mochi_memory": {
                  Row: {
                    "content": string,"kind": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"kind": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "content"?: string,"kind"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"mood_logs": {
                  Row: {
                    "created_at": string | null,"id": string,"logged_date": string | null,"mood": number,"note": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"logged_date"?: string | null,"mood": number,"note"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"logged_date"?: string | null,"mood"?: number,"note"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "mood_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"partner_checkins": {
                  Row: {
                    "day": string,"mood": number,"note": string | null,"space_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"mood": number,"note"?: string | null,"space_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "day"?: string,"mood"?: number,"note"?: string | null,"space_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "partner_checkins_space_id_fkey"
      columns: ["space_id"]
isOneToOne: false
      referencedRelation: "partner_spaces"
      referencedColumns: ["id"]
    }
                  ]
                },"partner_notes": {
                  Row: {
                    "author_id": string,"content": string,"created_at": string,"id": string,"read_at": string | null,"space_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"content": string,"created_at"?: string,"id"?: string,"read_at"?: string | null,"space_id": string
                  }
                  Update: {
                    "author_id"?: string,"content"?: string,"created_at"?: string,"id"?: string,"read_at"?: string | null,"space_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "partner_notes_space_id_fkey"
      columns: ["space_id"]
isOneToOne: false
      referencedRelation: "partner_spaces"
      referencedColumns: ["id"]
    }
                  ]
                },"partner_spaces": {
                  Row: {
                    "created_at": string,"id": string,"invite_code": string,"invite_status": string,"owner_user_id": string,"partner_role": string,"partner_user_id": string | null,"shared_fields": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"invite_code": string,"invite_status"?: string,"owner_user_id": string,"partner_role"?: string,"partner_user_id"?: string | null,"shared_fields"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"invite_code"?: string,"invite_status"?: string,"owner_user_id"?: string,"partner_role"?: string,"partner_user_id"?: string | null,"shared_fields"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "partner_spaces_owner_user_id_fkey"
      columns: ["owner_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "partner_spaces_partner_user_id_fkey"
      columns: ["partner_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"point_rules": {
                  Row: {
                    "daily_cap": number,"event": string,"points": number
                  }
                  ComputedFields: never
                  Insert: {
                    "daily_cap"?: number,"event": string,"points": number
                  }
                  Update: {
                    "daily_cap"?: number,"event"?: string,"points"?: number
                  }
                  Relationships: [
                    
                  ]
                },"points_ledger": {
                  Row: {
                    "created_at": string,"event": string,"id": string,"points": number,"ref": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event": string,"id"?: string,"points": number,"ref"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"event"?: string,"id"?: string,"points"?: number,"ref"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "age_group": string | null,"app_mode": string,"created_at": string | null,"full_name": string | null,"id": string,"is_admin": boolean | null,"mochi_name": string,"total_points": number | null,"wake_up_time": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "age_group"?: string | null,"app_mode"?: string,"created_at"?: string | null,"full_name"?: string | null,"id": string,"is_admin"?: boolean | null,"mochi_name"?: string,"total_points"?: number | null,"wake_up_time"?: string | null
                  }
                  Update: {
                    "age_group"?: string | null,"app_mode"?: string,"created_at"?: string | null,"full_name"?: string | null,"id"?: string,"is_admin"?: boolean | null,"mochi_name"?: string,"total_points"?: number | null,"wake_up_time"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"push_tokens": {
                  Row: {
                    "platform": string,"quiet_enabled": boolean,"quiet_end": number,"quiet_start": number,"token": string,"tz_offset_min": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "platform"?: string,"quiet_enabled"?: boolean,"quiet_end"?: number,"quiet_start"?: number,"token": string,"tz_offset_min"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "platform"?: string,"quiet_enabled"?: boolean,"quiet_end"?: number,"quiet_start"?: number,"token"?: string,"tz_offset_min"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quick_notes": {
                  Row: {
                    "color": string,"content": string,"created_at": string | null,"id": string,"is_pinned": boolean,"title": string | null,"updated_at": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"content": string,"created_at"?: string | null,"id"?: string,"is_pinned"?: boolean,"title"?: string | null,"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "color"?: string,"content"?: string,"created_at"?: string | null,"id"?: string,"is_pinned"?: boolean,"title"?: string | null,"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quick_notes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_cook_sessions": {
                  Row: {
                    "finished_at": string | null,"id": string,"is_finished": boolean,"last_step_completed": number,"rating": number | null,"recipe_id": string,"servings_cooked": number | null,"session_notes": string | null,"started_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "finished_at"?: string | null,"id"?: string,"is_finished"?: boolean,"last_step_completed"?: number,"rating"?: number | null,"recipe_id": string,"servings_cooked"?: number | null,"session_notes"?: string | null,"started_at"?: string,"user_id": string
                  }
                  Update: {
                    "finished_at"?: string | null,"id"?: string,"is_finished"?: boolean,"last_step_completed"?: number,"rating"?: number | null,"recipe_id"?: string,"servings_cooked"?: number | null,"session_notes"?: string | null,"started_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_cook_sessions_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_ingredients": {
                  Row: {
                    "amount": number | null,"id": string,"name": string,"notes": string | null,"order_index": number,"recipe_id": string,"unit": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"id"?: string,"name": string,"notes"?: string | null,"order_index"?: number,"recipe_id": string,"unit"?: string | null
                  }
                  Update: {
                    "amount"?: number | null,"id"?: string,"name"?: string,"notes"?: string | null,"order_index"?: number,"recipe_id"?: string,"unit"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_ingredients_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_publications": {
                  Row: {
                    "cook_time_minutes": number,"cuisine_type": string | null,"description": string | null,"difficulty": string,"generation_type": string,"hidden_reason": string | null,"id": string,"image_url": string | null,"ingredients_snapshot": NonNullable<Json>,"is_hidden": boolean,"is_published": boolean,"owner_id": string,"owner_name": string,"prep_time_minutes": number,"published_at": string,"servings": number,"source_recipe_id": string,"steps_snapshot": NonNullable<Json>,"tags": (string)[],"title": string,"total_time_minutes": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cook_time_minutes"?: number,"cuisine_type"?: string | null,"description"?: string | null,"difficulty": string,"generation_type"?: string,"hidden_reason"?: string | null,"id"?: string,"image_url"?: string | null,"ingredients_snapshot"?: NonNullable<Json>,"is_hidden"?: boolean,"is_published"?: boolean,"owner_id": string,"owner_name"?: string,"prep_time_minutes"?: number,"published_at"?: string,"servings"?: number,"source_recipe_id": string,"steps_snapshot"?: NonNullable<Json>,"tags"?: (string)[],"title": string,"total_time_minutes"?: number,"updated_at"?: string
                  }
                  Update: {
                    "cook_time_minutes"?: number,"cuisine_type"?: string | null,"description"?: string | null,"difficulty"?: string,"generation_type"?: string,"hidden_reason"?: string | null,"id"?: string,"image_url"?: string | null,"ingredients_snapshot"?: NonNullable<Json>,"is_hidden"?: boolean,"is_published"?: boolean,"owner_id"?: string,"owner_name"?: string,"prep_time_minutes"?: number,"published_at"?: string,"servings"?: number,"source_recipe_id"?: string,"steps_snapshot"?: NonNullable<Json>,"tags"?: (string)[],"title"?: string,"total_time_minutes"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_publications_source_recipe_id_fkey"
      columns: ["source_recipe_id"]
isOneToOne: true
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": string,"publication_id": string,"reason": string,"reporter_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"publication_id": string,"reason": string,"reporter_id": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"publication_id"?: string,"reason"?: string,"reporter_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_reports_publication_id_fkey"
      columns: ["publication_id"]
isOneToOne: false
      referencedRelation: "recipe_publications"
      referencedColumns: ["id"]
    }
                  ]
                },"recipe_steps": {
                  Row: {
                    "duration_seconds": number | null,"id": string,"instructions": string,"recipe_id": string,"step_number": number,"temperature": string | null,"tip": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "duration_seconds"?: number | null,"id"?: string,"instructions": string,"recipe_id": string,"step_number": number,"temperature"?: string | null,"tip"?: string | null,"title": string
                  }
                  Update: {
                    "duration_seconds"?: number | null,"id"?: string,"instructions"?: string,"recipe_id"?: string,"step_number"?: number,"temperature"?: string | null,"tip"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recipe_steps_recipe_id_fkey"
      columns: ["recipe_id"]
isOneToOne: false
      referencedRelation: "recipes"
      referencedColumns: ["id"]
    }
                  ]
                },"recipes": {
                  Row: {
                    "cook_time_minutes": number,"created_at": string,"cuisine_type": string | null,"description": string | null,"difficulty": string,"id": string,"image_url": string | null,"is_favorite": boolean,"personal_notes": string | null,"prep_time_minutes": number,"servings": number,"tags": (string)[],"title": string,"total_time_minutes": number,"updated_at": string,"user_id": string,"user_prompt": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cook_time_minutes"?: number,"created_at"?: string,"cuisine_type"?: string | null,"description"?: string | null,"difficulty"?: string,"id"?: string,"image_url"?: string | null,"is_favorite"?: boolean,"personal_notes"?: string | null,"prep_time_minutes"?: number,"servings"?: number,"tags"?: (string)[],"title": string,"total_time_minutes"?: number,"updated_at"?: string,"user_id": string,"user_prompt"?: string | null
                  }
                  Update: {
                    "cook_time_minutes"?: number,"created_at"?: string,"cuisine_type"?: string | null,"description"?: string | null,"difficulty"?: string,"id"?: string,"image_url"?: string | null,"is_favorite"?: boolean,"personal_notes"?: string | null,"prep_time_minutes"?: number,"servings"?: number,"tags"?: (string)[],"title"?: string,"total_time_minutes"?: number,"updated_at"?: string,"user_id"?: string,"user_prompt"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"rewards": {
                  Row: {
                    "created_at": string | null,"description": string | null,"id": string,"is_redeemed": boolean | null,"points_cost": number,"redeemed_at": string | null,"title": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"description"?: string | null,"id"?: string,"is_redeemed"?: boolean | null,"points_cost"?: number,"redeemed_at"?: string | null,"title": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"description"?: string | null,"id"?: string,"is_redeemed"?: boolean | null,"points_cost"?: number,"redeemed_at"?: string | null,"title"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "rewards_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"routine_exercises": {
                  Row: {
                    "exercise_id": string | null,"id": string,"order_index": number | null,"routine_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "exercise_id"?: string | null,"id"?: string,"order_index"?: number | null,"routine_id"?: string | null
                  }
                  Update: {
                    "exercise_id"?: string | null,"id"?: string,"order_index"?: number | null,"routine_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "routine_exercises_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "routine_exercises_routine_id_fkey"
      columns: ["routine_id"]
isOneToOne: false
      referencedRelation: "routines"
      referencedColumns: ["id"]
    }
                  ]
                },"routine_logs": {
                  Row: {
                    "completed_at": string | null,"id": string,"routine_id": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"id"?: string,"routine_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "completed_at"?: string | null,"id"?: string,"routine_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "routine_logs_routine_id_fkey"
      columns: ["routine_id"]
isOneToOne: false
      referencedRelation: "routines"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "routine_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"routines": {
                  Row: {
                    "created_at": string | null,"days": (number)[],"id": string,"name": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"days": (number)[],"id"?: string,"name": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"days"?: (number)[],"id"?: string,"name"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "routines_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"streak_recovery_plans": {
                  Row: {
                    "completed_tasks": number,"created_at": string,"id": string,"initiated_at": string,"is_active": boolean,"recovery_tasks": NonNullable<Json>,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_tasks"?: number,"created_at"?: string,"id"?: string,"initiated_at"?: string,"is_active"?: boolean,"recovery_tasks": NonNullable<Json>,"user_id": string
                  }
                  Update: {
                    "completed_tasks"?: number,"created_at"?: string,"id"?: string,"initiated_at"?: string,"is_active"?: boolean,"recovery_tasks"?: NonNullable<Json>,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "streak_recovery_plans_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"streaks": {
                  Row: {
                    "current_streak": number | null,"id": string,"last_activity_date": string | null,"longest_streak": number | null,"updated_at": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "current_streak"?: number | null,"id"?: string,"last_activity_date"?: string | null,"longest_streak"?: number | null,"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "current_streak"?: number | null,"id"?: string,"last_activity_date"?: string | null,"longest_streak"?: number | null,"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "streaks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"study_blocks": {
                  Row: {
                    "color": string | null,"created_at": string | null,"day_of_week": number,"end_time": string,"id": string,"start_time": string,"subject": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string | null,"created_at"?: string | null,"day_of_week": number,"end_time": string,"id"?: string,"start_time": string,"subject": string,"user_id"?: string | null
                  }
                  Update: {
                    "color"?: string | null,"created_at"?: string | null,"day_of_week"?: number,"end_time"?: string,"id"?: string,"start_time"?: string,"subject"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_blocks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"study_sessions": {
                  Row: {
                    "completed_at": string | null,"duration_seconds": number,"id": string,"study_block_id": string | null,"subject": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"duration_seconds": number,"id"?: string,"study_block_id"?: string | null,"subject": string,"user_id"?: string | null
                  }
                  Update: {
                    "completed_at"?: string | null,"duration_seconds"?: number,"id"?: string,"study_block_id"?: string | null,"subject"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_sessions_study_block_id_fkey"
      columns: ["study_block_id"]
isOneToOne: false
      referencedRelation: "study_blocks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"token_transactions": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"note": string | null,"source": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"note"?: string | null,"source": string,"user_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"note"?: string | null,"source"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_achievements": {
                  Row: {
                    "achievement_id": string | null,"id": string,"unlocked_at": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "achievement_id"?: string | null,"id"?: string,"unlocked_at"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "achievement_id"?: string | null,"id"?: string,"unlocked_at"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_achievements_achievement_id_fkey"
      columns: ["achievement_id"]
isOneToOne: false
      referencedRelation: "achievements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_achievements_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_consents": {
                  Row: {
                    "granted": boolean,"kind": string,"policy_version": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted": boolean,"kind": string,"policy_version"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "granted"?: boolean,"kind"?: string,"policy_version"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_settings": {
                  Row: {
                    "cooking_enabled": boolean,"exercise_enabled": boolean | null,"goals_enabled": boolean | null,"gratitude_enabled": boolean | null,"habits_enabled": boolean | null,"id": string,"mood_enabled": boolean | null,"notes_enabled": boolean | null,"partner_features_enabled": boolean,"quick_capture_enabled": boolean,"study_enabled": boolean | null,"updated_at": string | null,"user_id": string | null,"vouchers_enabled": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cooking_enabled"?: boolean,"exercise_enabled"?: boolean | null,"goals_enabled"?: boolean | null,"gratitude_enabled"?: boolean | null,"habits_enabled"?: boolean | null,"id"?: string,"mood_enabled"?: boolean | null,"notes_enabled"?: boolean | null,"partner_features_enabled"?: boolean,"quick_capture_enabled"?: boolean,"study_enabled"?: boolean | null,"updated_at"?: string | null,"user_id"?: string | null,"vouchers_enabled"?: boolean | null
                  }
                  Update: {
                    "cooking_enabled"?: boolean,"exercise_enabled"?: boolean | null,"goals_enabled"?: boolean | null,"gratitude_enabled"?: boolean | null,"habits_enabled"?: boolean | null,"id"?: string,"mood_enabled"?: boolean | null,"notes_enabled"?: boolean | null,"partner_features_enabled"?: boolean,"quick_capture_enabled"?: boolean,"study_enabled"?: boolean | null,"updated_at"?: string | null,"user_id"?: string | null,"vouchers_enabled"?: boolean | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_settings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_token_tiers": {
                  Row: {
                    "tier": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "tier"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "tier"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"voucher_templates": {
                  Row: {
                    "color": string,"created_at": string | null,"description": string | null,"icon": string,"id": string,"points_cost": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string | null,"description"?: string | null,"icon"?: string,"id"?: string,"points_cost"?: number,"title": string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string | null,"description"?: string | null,"icon"?: string,"id"?: string,"points_cost"?: number,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"vouchers": {
                  Row: {
                    "color": string,"created_at": string | null,"created_by": string | null,"description": string | null,"icon": string,"id": string,"image_url": string | null,"is_redeemed": boolean | null,"mode": string,"points_cost": number,"redeemed_at": string | null,"redeemed_by": string | null,"space_id": string | null,"template_id": string | null,"title": string,"updated_by_partner": boolean,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string | null,"created_by"?: string | null,"description"?: string | null,"icon"?: string,"id"?: string,"image_url"?: string | null,"is_redeemed"?: boolean | null,"mode"?: string,"points_cost"?: number,"redeemed_at"?: string | null,"redeemed_by"?: string | null,"space_id"?: string | null,"template_id"?: string | null,"title": string,"updated_by_partner"?: boolean,"user_id"?: string | null
                  }
                  Update: {
                    "color"?: string,"created_at"?: string | null,"created_by"?: string | null,"description"?: string | null,"icon"?: string,"id"?: string,"image_url"?: string | null,"is_redeemed"?: boolean | null,"mode"?: string,"points_cost"?: number,"redeemed_at"?: string | null,"redeemed_by"?: string | null,"space_id"?: string | null,"template_id"?: string | null,"title"?: string,"updated_by_partner"?: boolean,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vouchers_redeemed_by_fkey"
      columns: ["redeemed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vouchers_space_id_fkey"
      columns: ["space_id"]
isOneToOne: false
      referencedRelation: "partner_spaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vouchers_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "voucher_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vouchers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_partner_invite":
{ Args: { "p_invite_code": string }; Returns: Json
                           },
"admin_dashboard_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_grant_entitlement":
{ Args: { "p_entitlement": string,"p_expires_at"?: string,"p_reason": string,"p_user_id": string }; Returns: undefined
                           },
"admin_list_grants":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,"entitlement": string,"expires_at": string,"full_name": string,"granted_by": string,"id": string,"reason": string,"user_id": string
            }[]
                           },
"admin_list_recipe_reports":
{ Args: Record<PropertyKey, never>; Returns: {
              "is_hidden": boolean,"last_report_at": string,"open_reports": number,"owner_name": string,"publication_id": string,"reasons": (string)[],"title": string
            }[]
                           },
"admin_resolve_recipe_reports":
{ Args: { "p_hide": boolean,"p_publication_id": string }; Returns: undefined
                           },
"admin_revenue_summary":
{ Args: Record<PropertyKey, never>; Returns: {
              "active_count": number,"cancelled_30d": number,"product_id": string,"renewing_count": number,"store": string
            }[]
                           },
"admin_revoke_grant":
{ Args: { "p_grant_id": string }; Returns: undefined
                           },
"apply_plan_limits_for_ai":
{ Args: { "p_metadata"?: Json,"p_reason": string,"p_source_ref"?: string }; Returns: Json
                           },
"award_points":
{ Args: { "p_event": string,"p_ref"?: string }; Returns: number
                           },
"check_ai_allowance":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"claim_ai_credit_from_ad":
{ Args: { "p_ad_network"?: string,"p_ad_unit_id"?: string,"p_reward_event_id": string }; Returns: Json
                           },
"consume_ai_credit":
{ Args: { "p_metadata"?: Json,"p_reason": string,"p_source_ref"?: string }; Returns: Json
                           },
"create_partner_invite":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"create_partner_voucher":
{ Args: { "p_color": string,"p_description": string,"p_icon": string,"p_image_url"?: string,"p_mode": string,"p_points_cost": number,"p_space_id": string,"p_template_id"?: string,"p_title": string }; Returns: string
                           },
"generate_voucher":
{ Args: { "p_template_id": string }; Returns: string
                           },
"get_admin_active_users_daily":
{ Args: { "days_back"?: number }; Returns: {
              "active_users": number,"day": string
            }[]
                           },
"get_admin_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_admin_users":
{ Args: { "page_limit"?: number,"page_offset"?: number }; Returns: {
              "created_at": string,"full_name": string,"id": string,"is_admin": boolean,"total_points": number,"wake_up_time": string
            }[]
                           },
"get_ai_credit_balance":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_partner_space_snapshot":
{ Args: { "p_space_id": string }; Returns: Json
                           },
"get_user_plan":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"grant_mochi_tokens":
{ Args: { "p_amount": number,"p_note"?: string,"p_source": string,"p_user_id": string }; Returns: Json
                           },
"has_active_grant":
{ Args: { "p_entitlement": string,"p_user_id": string }; Returns: boolean
                           },
"has_consent":
{ Args: { "p_kind": string,"p_user_id": string }; Returns: boolean
                           },
"import_public_recipe":
{ Args: { "p_publication_id": string }; Returns: string
                           },
"increment_points":
{ Args: { "points": number,"user_id": string }; Returns: undefined
                           },
"is_admin_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_space_member":
{ Args: { "p_space_id": string }; Returns: boolean
                           },
"leave_partner_space":
{ Args: { "p_space_id": string }; Returns: undefined
                           },
"log_cycle_summary":
{ Args: { "p_cycle_length"?: number,"p_period_end"?: string,"p_period_start": string,"p_source"?: string }; Returns: undefined
                           },
"mark_partner_notes_read":
{ Args: { "p_space_id": string }; Returns: undefined
                           },
"plan_features":
{ Args: { "p_is_premium": boolean }; Returns: Json
                           },
"publish_recipe_to_catalog":
{ Args: { "p_generation_type"?: string,"p_recipe_id": string }; Returns: string
                           },
"purge_ai_cache":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"purge_ai_gateway_requests":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"redeem_voucher":
{ Args: { "p_voucher_id": string }; Returns: undefined
                           },
"refresh_mochi_memory":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"refresh_weekly_mochi_memory":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"register_push_token":
{ Args: { "p_platform"?: string,"p_quiet_enabled"?: boolean,"p_quiet_end"?: number,"p_quiet_start"?: number,"p_token": string,"p_tz_offset_min"?: number }; Returns: undefined
                           },
"report_recipe":
{ Args: { "p_details"?: string,"p_publication_id": string,"p_reason": string }; Returns: undefined
                           },
"review_flashcard":
{ Args: { "p_card_id": string,"p_quality": number }; Returns: Json
                           },
"send_partner_note":
{ Args: { "p_content": string,"p_space_id": string }; Returns: string
                           },
"server_ai_gateway_check":
{ Args: { "p_model": string,"p_user_id": string }; Returns: boolean
                           },
"server_apply_plan_limits":
{ Args: { "p_source_ref": string,"p_user_id": string }; Returns: Json
                           },
"server_claim_ad_credit":
{ Args: { "p_ad_network": string,"p_ad_unit_id": string,"p_reward_event_id": string,"p_user_id": string }; Returns: Json
                           },
"server_get_mochi_memory":
{ Args: { "p_user_id": string }; Returns: string
                           },
"server_refund_ai_credit":
{ Args: { "p_source_ref": string,"p_user_id": string }; Returns: undefined
                           },
"server_sync_subscription":
{ Args: { "p_auto_renew": boolean,"p_entitlement_id": string,"p_event_id": string,"p_event_type": string,"p_external_customer_id": string,"p_payload": Json,"p_period_end": string,"p_period_start": string,"p_product_id": string,"p_status": string,"p_store": string,"p_user_id": string }; Returns: Json
                           },
"server_voucher_push_targets":
{ Args: { "p_caller": string,"p_voucher_id": string }; Returns: {
              "quiet_enabled": boolean,"quiet_end": number,"quiet_start": number,"title": string,"token": string,"tz_offset_min": number
            }[]
                           },
"set_admin":
{ Args: { "p_user_id": string,"p_value": boolean }; Returns: undefined
                           },
"set_age_group":
{ Args: { "p_group": string,"p_guardian_ok"?: boolean }; Returns: undefined
                           },
"set_app_mode":
{ Args: { "p_mode": string }; Returns: undefined
                           },
"set_consent":
{ Args: { "p_granted": boolean,"p_kind": string }; Returns: undefined
                           },
"set_mochi_tone":
{ Args: { "p_tone": string }; Returns: undefined
                           },
"space_is_plus":
{ Args: { "p_space_id": string }; Returns: boolean
                           },
"spend_mochi_tokens":
{ Args: { "p_amount": number,"p_note"?: string,"p_source": string,"p_user_id": string }; Returns: number
                           },
"sync_subscription_from_revenuecat":
{ Args: { "p_auto_renew"?: boolean,"p_current_period_ends_at"?: string,"p_current_period_started_at"?: string,"p_entitlement_id"?: string,"p_event_id"?: string,"p_event_type"?: string,"p_external_customer_id"?: string,"p_payload"?: Json,"p_product_id"?: string,"p_provider"?: string,"p_status"?: string,"p_store"?: string }; Returns: Json
                           },
"token_daily_limit":
{ Args: { "p_tier": string }; Returns: number
                           },
"unpublish_recipe_from_catalog":
{ Args: { "p_recipe_id": string }; Returns: undefined
                           },
"update_partner_space_prefs":
{ Args: { "p_fields": Json,"p_space_id": string }; Returns: Json
                           },
"upsert_partner_checkin":
{ Args: { "p_day": string,"p_mood": number,"p_note"?: string,"p_space_id": string }; Returns: undefined
                           },
"user_is_premium":
{ Args: { "p_uid": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
