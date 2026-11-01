import { supabase } from '../../../services/supabase';
import { DiscountRule } from './types';
import { SplitPackingMode } from './pdfExportGenerator';

export interface MasterLcdTemplateConfig {
  // Filter settings
  selectedBrand?: string;
  selectedBrandHp?: string;
  searchTerm?: string;
  columnFilters?: Record<string, string[]>;
  // Active visible columns
  visibleKeys?: string[];
  // Discount rules
  discountRules?: DiscountRule[];
  // PDF export settings
  pdfConfig?: {
    dataScope?: 'filtered' | 'all';
    brandLcd?: 'XPAS' | 'VIVAN' | 'ALL' | 'FILTERED';
    selectedBrands?: string[];
    discountChoice?: string;
    splitMode?: SplitPackingMode;
    maxRowsPerPage?: number;
    orientation?: 'landscape' | 'portrait';
    includeStock?: boolean;
  };
  // Excel export settings
  excelConfig?: {
    dataScope?: 'all' | 'filtered';
    includeVivan?: boolean;
    includeXpas?: boolean;
    includeAll?: boolean;
    primarySortCol?: string;
    primarySortAsc?: boolean;
    secondarySortCol?: string;
    secondarySortAsc?: boolean;
    useGoldenStyle?: boolean;
    customSheetTitle?: string;
    xpasDiscountChoice?: string;
    vivanDiscountChoice?: string;
    showStock?: boolean;
  };
}

export interface MasterLcdTemplate {
  id: string;
  name: string;
  description?: string;
  target_type: 'all' | 'pdf' | 'excel' | 'view';
  config: MasterLcdTemplateConfig;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'master_lcd_saved_templates_v1';

// Helper to read localStorage templates
function getLocalTemplates(): MasterLcdTemplate[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse local templates:', e);
  }
  return [];
}

// Helper to save to localStorage
function saveLocalTemplates(templates: MasterLcdTemplate[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
  } catch (e) {
    console.warn('Failed to save templates to localStorage:', e);
  }
}

// Auto-create table if missing
async function ensureTemplatesTableExists(): Promise<boolean> {
  try {
    await supabase.rpc('exec_sql', {
      query_text: `
        CREATE TABLE IF NOT EXISTS master_lcd_templates (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          target_type TEXT DEFAULT 'all',
          config JSONB NOT NULL DEFAULT '{}'::jsonb,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE master_lcd_templates ENABLE ROW LEVEL SECURITY;
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'master_lcd_templates' AND policyname = 'Allow all operations for master_lcd_templates'
          ) THEN
            CREATE POLICY "Allow all operations for master_lcd_templates" ON master_lcd_templates FOR ALL USING (true) WITH CHECK (true);
          END IF;
        END $$;
      `
    });
    return true;
  } catch (e) {
    console.warn('Auto create master_lcd_templates table failed:', e);
    return false;
  }
}

/**
 * Fetch all templates from Supabase with localStorage backup fallback
 */
export async function fetchTemplates(): Promise<MasterLcdTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('master_lcd_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        // Table not created yet, try auto-create
        const created = await ensureTemplatesTableExists();
        if (created) {
          const retry = await supabase
            .from('master_lcd_templates')
            .select('*')
            .order('created_at', { ascending: false });
          if (!retry.error && retry.data) {
            saveLocalTemplates(retry.data);
            return retry.data;
          }
        }
      }
      console.warn('Supabase fetch templates failed, using local storage:', error.message);
      return getLocalTemplates();
    }

    if (data) {
      saveLocalTemplates(data);
      return data;
    }
  } catch (err) {
    console.warn('Exception fetching templates from Supabase:', err);
  }

  return getLocalTemplates();
}

/**
 * Save a new template to Supabase & localStorage
 */
export async function createTemplate(
  template: Omit<MasterLcdTemplate, 'id' | 'created_at' | 'updated_at'>
): Promise<MasterLcdTemplate> {
  const newId = crypto.randomUUID ? crypto.randomUUID() : `tmpl-${Date.now()}`;
  const now = new Date().toISOString();

  const newRecord: MasterLcdTemplate = {
    ...template,
    id: newId,
    created_at: now,
    updated_at: now
  };

  try {
    const { data, error } = await supabase
      .from('master_lcd_templates')
      .insert([
        {
          name: template.name,
          description: template.description || '',
          target_type: template.target_type || 'all',
          config: template.config,
          is_default: template.is_default || false
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '42P01') {
        await ensureTemplatesTableExists();
        const retry = await supabase
          .from('master_lcd_templates')
          .insert([
            {
              name: template.name,
              description: template.description || '',
              target_type: template.target_type || 'all',
              config: template.config,
              is_default: template.is_default || false
            }
          ])
          .select()
          .single();
        if (!retry.error && retry.data) {
          const localList = [retry.data, ...getLocalTemplates().filter(t => t.id !== retry.data.id)];
          saveLocalTemplates(localList);
          return retry.data;
        }
      }
      throw error;
    }

    if (data) {
      const localList = [data, ...getLocalTemplates().filter(t => t.id !== data.id)];
      saveLocalTemplates(localList);
      return data;
    }
  } catch (err: any) {
    console.warn('Failed to insert template into Supabase, saving locally:', err.message);
  }

  // Fallback to local
  const currentLocal = getLocalTemplates();
  const updatedLocal = [newRecord, ...currentLocal];
  saveLocalTemplates(updatedLocal);
  return newRecord;
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Omit<MasterLcdTemplate, 'id' | 'created_at'>>
): Promise<MasterLcdTemplate | null> {
  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase
      .from('master_lcd_templates')
      .update({
        ...updates,
        updated_at: now
      })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      const localList = getLocalTemplates().map(t => (t.id === id ? data : t));
      saveLocalTemplates(localList);
      return data;
    }
  } catch (err) {
    console.warn('Failed to update template in Supabase:', err);
  }

  // Fallback update in local storage
  const localList = getLocalTemplates();
  let updatedItem: MasterLcdTemplate | null = null;
  const updatedList = localList.map(t => {
    if (t.id === id) {
      updatedItem = { ...t, ...updates, updated_at: now };
      return updatedItem;
    }
    return t;
  });
  saveLocalTemplates(updatedList);
  return updatedItem;
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('master_lcd_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Failed to delete template in Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Exception deleting template in Supabase:', err);
  }

  // Also remove from local
  const localList = getLocalTemplates().filter(t => t.id !== id);
  saveLocalTemplates(localList);
  return true;
}
