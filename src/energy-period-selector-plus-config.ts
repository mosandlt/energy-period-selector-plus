import { LovelaceCardConfig } from 'custom-card-helpers';
import { EnergyCardBaseConfig } from './type/energy-card-base-config';

export interface EnergyPeriodSelectorPlusConfig extends LovelaceCardConfig, EnergyCardBaseConfig {
  card_background?: boolean;
  prev_next_buttons?: boolean;
  compare_mode?: 'previous' | 'yoy';
  compare_button_type?: string;
  compare_button_label?: string;
  today_button_type?: string | boolean;
  period_buttons?: string[];
  custom_period_label?: string;
  default_period?: 'day' | 'week' | 'month' | 'year' | 'billing';
  billing_cycle_day?: number;
  billing_period_label?: string;
  start_date_entity?: string;
  end_date_entity?: string;
}

export function validatePeriodConfig(config: EnergyPeriodSelectorPlusConfig): void {
  for (const field of ['start_date_entity', 'end_date_entity'] as const) {
    if (config[field] !== undefined && (typeof config[field] !== 'string' || !config[field]!.startsWith('input_datetime.'))) {
      throw new Error(`${field} must start with "input_datetime.".`);
    }
  }
  if (config.billing_cycle_day !== undefined &&
      (!Number.isInteger(config.billing_cycle_day) || config.billing_cycle_day < 1 || config.billing_cycle_day > 28)) {
    throw new Error('billing_cycle_day must be an integer from 1 to 28.');
  }
  if (config.default_period !== undefined && !['day', 'week', 'month', 'year', 'billing'].includes(config.default_period)) {
    throw new Error('default_period must be "day", "week", "month", "year" or "billing".');
  }
  if (config.default_period === 'billing' && config.billing_cycle_day === undefined) {
    throw new Error('default_period "billing" requires billing_cycle_day.');
  }
}
