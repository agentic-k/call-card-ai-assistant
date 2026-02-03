export interface Template {
  template_id: string;
  template_name: string;
  description: string;
  content: {
    sections: Array<{
      title: string;
      duration_minutes: number;
      items: Array<{
        id: string;
        text: string;
        isCompleted?: boolean;
      }>;
    }>;
    total_duration_minutes: number;
  };
} 