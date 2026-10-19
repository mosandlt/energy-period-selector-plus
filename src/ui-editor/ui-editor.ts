/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-use-before-define */

import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fireEvent, HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { EnergyCardBaseConfig } from '../type/energy-card-base-config';
import { any, assert, assign, boolean, enums, integer, number, object, optional, string } from 'superstruct';
import { localize } from '../localize/localize';
import memoizeOne from 'memoize-one';
import { EnergyPeriodSelectorPlusConfig } from '../energy-period-selector-plus-config';
import { SchemaUnion } from './types/schema-union';

export const loadHaForm = async () => {
  if (customElements.get('ha-form')) return;

  const helpers = await (window as any).loadCardHelpers?.();
  if (!helpers) return;
  const card = await helpers.createCardElement({ type: 'entity' });
  if (!card) return;
  await card.getConfigElement();
};

@customElement('energy-period-selector-editor')
export class EnergyPeriodSelectorEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: EnergyPeriodSelectorPlusConfig;

  public async setConfig(config: EnergyPeriodSelectorPlusConfig): Promise<void> {
    assert(
      config,
      assign(
        object({
          type: string(),
          view_layout: optional(string()),
        }),
        object({
          title: optional(string()),
          card_background: optional(boolean()),
          today_button: optional(boolean()),
          prev_next_buttons: optional(boolean()),
          compare_button_type: optional(string()),
          compare_mode: optional(enums(['previous', 'yoy'])),
          collection_key: optional(string()),
          today_button_type: optional(any()),
          period_buttons: optional(any()),
          custom_period_label: optional(string()),
          compare_button_label: optional(string()),
        }),
      ),
    );
    if (config.collection_key !== undefined && !config.collection_key.startsWith('energy_')) {
      throw new Error('collection_key must start with "energy_".');
    }
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    loadHaForm();
  }

  private _schema = memoizeOne(
    (showCompareLabel, showCustomPeriodLabel) =>
      [
        { name: 'collection_key', selector: { text: {} } },
        {
          name: 'compare_mode',
          selector: {
            select: {
              options: [
                { value: 'previous', label: 'Previous period' },
                { value: 'yoy', label: 'Previous year' },
              ],
              mode: 'dropdown',
            },
          },
        },
        {
          type: 'grid',
          name: '',
          schema: [
            {
              name: 'card_background',
              selector: { boolean: {} },
            },
            {
              name: 'prev_next_buttons',
              selector: { boolean: {} },
            },
          ],
        },
        {
          type: 'grid',
          name: '',
          schema: [
            {
              name: 'compare_button_type',
              selector: {
                select: {
                  options: [
                    { value: '', label: '' },
                    { value: 'icon', label: localize('editor.fields.compare_button_options.icon') },
                    { value: 'text', label: localize('editor.fields.compare_button_options.text') },
                  ],
                  mode: 'dropdown',
                },
              },
            },
            ...(showCompareLabel
              ? ([
                  {
                    name: 'compare_button_label',
                    selector: { text: {} },
                  },
                ] as const)
              : []),
          ],
        },
        {
          name: 'today_button_type',
          selector: {
            select: {
              options: [
                { value: false, label: '' },
                { value: 'icon', label: localize('editor.fields.compare_button_options.icon') },
                { value: 'text', label: localize('editor.fields.compare_button_options.text') },
              ],
              mode: 'dropdown',
            },
          },
        },
        {
          type: 'grid',
          name: '',
          schema: [
            {
              type: 'multi_select',
              options: {
                day: localize('editor.fields.period_buttons_options.day'),
                week: localize('editor.fields.period_buttons_options.week'),
                month: localize('editor.fields.period_buttons_options.month'),
                year: localize('editor.fields.period_buttons_options.year'),
                custom: localize('editor.fields.period_buttons_options.custom'),
              },
              name: 'period_buttons',
              default: ['day', 'week', 'month', 'year'],
            },
            ...(showCustomPeriodLabel
              ? ([
                  {
                    name: 'custom_period_label',
                    selector: { text: {} },
                  },
                ] as const)
              : []),
          ],
        },
      ] as const,
  );

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const data = {
      ...this._config,
      card_background: this._config.card_background ?? false,
      today_button: this._config.today_button ?? true,
      prev_next_buttons: this._config.prev_next_buttons ?? true,
      compare_button_type: this._config.compare_button_type ?? '',
      compare_mode: this._config.compare_mode ?? 'previous',
      today_button_type: this._config.today_button_type ?? 'text',
      period_buttons: this._config.period_buttons ?? ['day', 'week', 'month', 'year'],
    };

    const schema = this._schema(data.compare_button_type === 'text', data.period_buttons.includes('custom'));
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${this._computeLabelCallback}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const config = { ...ev.detail.value };
    if (config.collection_key === '') delete config.collection_key;
    fireEvent(this, 'config-changed', { config });
  }

  private _computeLabelCallback = schema => {
    if (schema.name === 'collection_key') return 'Collection key (energy_…)';
    if (schema.name === 'compare_mode') return 'Compare mode';
    return localize(`editor.fields.${schema.name}`) || `not found: ${schema.name}`;
  };

  static get styles() {
    return css`
      ha-form {
        width: 100%;
      }

      ha-icon-button {
        align-self: center;
      }

      .card-config {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .config-header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .config-header.sub-header {
        margin-top: 24px;
      }

      ha-icon {
        padding-bottom: 2px;
        position: relative;
        top: -4px;
        right: 1px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'energy-period-selector-editor': EnergyPeriodSelectorEditor;
  }
}
