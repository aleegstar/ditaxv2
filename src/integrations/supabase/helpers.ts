
import { Database } from './types';

/**
 * Helper functions for safely working with Supabase's typed client
 */

// Generic type for Supabase table rows
export type TableRow<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

// Generic type for Supabase table inserts
export type TableInsert<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert'];

// Type-safe filter function for equality
export const eq = <T extends string>(
  column: T, 
  value: any
) => {
  return { [column]: value };
};

// Type-safe boolean value setter
export const bool = (value: boolean) => {
  return value;
};

// Type-safe insertion helper
export function createInsertObject<T extends keyof Database['public']['Tables']>(
  data: Record<string, any>
): TableInsert<T> {
  return data as unknown as TableInsert<T>;
}

// Type assertion helper for single record
export function asRecord<T>(data: any): T {
  return data as T;
}

// Type assertion helper for profiles data
export function asProfileData(data: any): { first_name: string; last_name: string } {
  return {
    first_name: data?.first_name || '',
    last_name: data?.last_name || ''
  };
}
