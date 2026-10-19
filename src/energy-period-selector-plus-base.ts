/* eslint-disable @typescript-eslint/no-explicit-any */
import { mdiCompare, mdiCompareRemove, mdiCalendarTodayOutline } from '@mdi/js';
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  endOfDay,
  endOfMonth,
  endOfToday,
  endOfWeek,
  endOfYear,
  isWithinInterval,
  isValid,
  format,
  parse,
  startOfDay,
  startOfMonth,
  startOfToday,
  startOfWeek,
  startOfYear,
} from 'date-fns/esm';
import { UnsubscribeFunc } from 'home-assistant-js-websocket';
import { html, LitElement, nothing, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import { firstWeekdayIndex } from './datetime/first-weekday';
import { formatDate, formatDateMonthYear, formatDateShort, formatDateYear } from './datetime/format-date';
import { toggleAttribute, ToggleButton } from './types';
import { computeRTLDirection } from './utils/compute_rtl';
import { EnergyDataLike, EnergyCollectionLike, findEnergyCollection } from './energy-collection';
import { SubscribeMixin } from './subscribe-mixin';
import { HomeAssistant } from './type/home-assistant';
import { EnergyPeriodSelectorPlusConfig } from './energy-period-selector-plus-config';
import type { DateRangePickerRanges } from './datetime';
import { billingPeriodStart, billingPeriodEnd, addBillingPeriods } from './billing-period';
import { EntitySyncValue, entitySyncPayload } from './entity-sync';
import { localize } from './localize/localize';
import { stylesBase } from './style';

@customElement('energy-period-selector-base')
export class EnergyPeriodSelectorBase extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() public _config?: EnergyPeriodSelectorPlusConfig;
  @property() public collectionKey?: string;
  @state() _startDate?: Date;
  @state() _endDate?: Date;
  @state() private _period?: 'day' | 'week' | 'month' | 'year' | 'billing' | 'custom';
  @state() private _compare = false;

  @state() private _componentsReady = false;
  private _componentsStarted = false;
  private _defaultPeriodApplied = false;
  private _entitySyncTimer?: ReturnType<typeof setTimeout>;
  private _syncedDates: { start?: EntitySyncValue; end?: EntitySyncValue } = {};

  private _collection?: EnergyCollectionLike;
  private _energyData?: EnergyDataLike;
  private _retryTimer?: ReturnType<typeof setTimeout>;
  private _subscriptionGeneration = 0;
  private _subscribedConnection?: HomeAssistant['connection'];
  private _subscribedKey?: string;

  public connectedCallback(): void {
    super.connectedCallback();
    if (!this._componentsStarted) {
      this._componentsStarted = true;
      void this._loadComponents();
    }
  }

  private async _loadComponents(): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      const helpers = await (window as any).loadCardHelpers?.();
      await helpers?.importMoreInfoControl?.('input_datetime');
      await Promise.all(
        ['ha-date-input', 'ha-icon-button-prev', 'ha-icon-button-next'].map(name => customElements.whenDefined(name)),
      );
    };
    try {
      await Promise.race([load(), new Promise<void>(resolve => { timer = setTimeout(resolve, 5000); })]);
    } catch {
      // Render anyway if a helper fails, or the components do not become available in time.
    } finally {
      clearTimeout(timer);
      this._componentsReady = true;
    }
    if (!customElements.get('ha-button')) {
      void customElements.whenDefined('ha-button').then(() => this.requestUpdate());
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has('_config') && this._period === 'billing' && this._energyData) {
      // Reclassify an active billing range if its configured start day changes or is removed.
      this._updateDates(this._energyData);
    }
    if (
      this.isConnected &&
      (changedProps.has('hass') || changedProps.has('collectionKey')) &&
      (this._collection !== findEnergyCollection(this.hass, this.collectionKey) ||
        this._subscribedConnection !== this.hass?.connection ||
        this._subscribedKey !== this.collectionKey)
    ) {
      this.resetSubscriptions();
    }
  }

  protected hassUnsubscribe() {
    ++this._subscriptionGeneration;
    clearTimeout(this._retryTimer);
    this._retryTimer = undefined;
    clearTimeout(this._entitySyncTimer);
    this._entitySyncTimer = undefined;
    this._syncedDates = {};
    this._collection = undefined;
    this._energyData = undefined;
    this._startDate = undefined;
    this._endDate = undefined;
    this._period = undefined;
    super.hassUnsubscribe();
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    const collection = findEnergyCollection(this.hass, this.collectionKey);
    this._subscribedConnection = this.hass.connection;
    this._subscribedKey = this.collectionKey;
    this._collection = collection;
    if (!collection) {
      this._retryTimer = setTimeout(() => {
        this._retryTimer = undefined;
        if (this.isConnected) this.resetSubscriptions();
      }, 1000);
      return [];
    }
    const generation = this._subscriptionGeneration;
    const connection = this.hass.connection;
    const key = this.collectionKey;
    return [
      collection.subscribe(data => {
        if (
          this.isConnected &&
          generation === this._subscriptionGeneration &&
          connection === this.hass.connection &&
          key === this.collectionKey &&
          collection === findEnergyCollection(this.hass, this.collectionKey)
        ) {
          this._updateDates(data);
        }
      }),
    ];
  }

  // HA moved this string between versions; use whichever key still resolves.
  private _todayLabel(): string {
    return (
      this.hass.localize('ui.panel.lovelace.components.energy_period_selector.today') ||
      this.hass.localize('ui.components.date-range-picker.ranges.today') ||
      this.hass.localize('ui.common.today') ||
      'Today'
    );
  }

  private _getPeriodButtons(): ToggleButton[] {
    const computeToggleButtonLabel = (period: string) => {
      if (period === 'billing') {
        return this._config?.billing_period_label || localize('toggleButtons.billing');
      }
      if (period === 'custom') {
        return this._config?.custom_period_label || localize(`toggleButtons.${period}`) || period;
      }
      return this.hass.localize(`ui.components.calendar.event.rrule.${period}`);
    };

    const periods = this._config?.period_buttons ?? ['day', 'week', 'month', 'year', ...(this._config?.billing_cycle_day ? ['billing'] : [])];
    return periods
      .filter(period => period !== 'billing' || this._config?.billing_cycle_day !== undefined)
      .map(period => ({ label: computeToggleButtonLabel(period), value: period }));
  }

  protected render() {
    if (!this._componentsReady || !this.hass || !findEnergyCollection(this.hass, this.collectionKey) || !this._startDate) {
      return nothing;
    }

    const periodButtons = this._getPeriodButtons();

    // Own button group instead of ha-button-toggle-group: HA only registers that element lazily (not on every page).
    const renderPeriodButton = (button: ToggleButton) => {
      const active = this._period === button.value;
      const select = () => this._selectPeriod(button.value as EnergyPeriodSelectorBase['_period']);
      return customElements.get('ha-button')
        ? html`<ha-button size="s" variant="brand" appearance=${active ? 'filled' : 'plain'} aria-pressed=${active} @click=${select}>${button.label}</ha-button>`
        : html`<mwc-button dense ?raised=${active} aria-pressed=${active} @click=${select}>${button.label}</mwc-button>`;
    };

    const dateRangePicker = html`
      <div class="date-range-container">
        <ha-date-input
          .locale=${this.hass.locale}
          .value=${format(this._startDate, 'yyyy-MM-dd')}
          .label=${this.hass.localize('ui.components.date-range-picker.start_date')}
          @value-changed=${this._startDateChanged}
          .required=${true}
          .min=${'2019-01-01'}
          .max=${format(endOfToday(), 'yyyy-MM-dd')}
        >
        </ha-date-input>
        <ha-date-input
          .locale=${this.hass.locale}
          .value=${this._endDate ? format(this._endDate, 'yyyy-MM-dd') : ''}
          .label=${this.hass.localize('ui.components.date-range-picker.end_date')}
          @value-changed=${this._endDateChanged}
          .required=${true}
          .min=${format(this._startDate, 'yyyy-MM-dd')}
          .max=${format(endOfToday(), 'yyyy-MM-dd')}
        >
        </ha-date-input>
      </div>
    `;

    const renderButton = (label: string, handler: () => void, className = '') =>
      customElements.get('ha-button')
        ? html`<ha-button appearance="outlined" size="s" class=${className} @click=${handler}>${label}</ha-button>`
        : html`<mwc-button dense outlined class=${className} @click=${handler}>${label}</mwc-button>`;

    const todayButtonText = renderButton(this._todayLabel(), this._pickToday);

    const todayButtonIcon = html` <ha-icon-button
      @click=${this._pickToday}
      class="today-icon"
      .label=${this._todayLabel()}
      .path=${mdiCalendarTodayOutline}
    >
    </ha-icon-button>`;

    const todayButton =
      this._config?.today_button_type === false ? nothing : this._config?.today_button_type === 'icon' ? todayButtonIcon : todayButtonText;

    return html`
      <div class="row">
        ${this._period === 'custom'
          ? dateRangePicker
          : html`
              <div class="label">
                ${this._period === 'day'
                  ? formatDate(this._startDate, this.hass.locale)
                  : this._period === 'month'
                  ? formatDateMonthYear(this._startDate, this.hass.locale)
                  : this._period === 'year'
                  ? formatDateYear(this._startDate, this.hass.locale)
                  : `${formatDateShort(this._startDate, this.hass.locale)} – ${formatDateShort(this._endDate || new Date(), this.hass.locale)}`}
                ${this._config?.prev_next_buttons !== false
                  ? html`
                      <ha-icon-button-prev
                        .label=${this.hass.localize('ui.panel.lovelace.components.energy_period_selector.previous')}
                        @click=${this._pickPrevious}
                      ></ha-icon-button-prev>
                      <ha-icon-button-next
                        .label=${this.hass.localize('ui.panel.lovelace.components.energy_period_selector.next')}
                        @click=${this._pickNext}
                      ></ha-icon-button-next>
                    `
                  : nothing}
                ${todayButton}
              </div>
            `}
        <div class="period">
          <div class="period-toggle" role="group" style="direction: ${computeRTLDirection(this.hass)}">
            ${periodButtons.map(button => renderPeriodButton(button))}
          </div>
          ${this._config?.compare_button_type === 'icon'
            ? html`<ha-icon-button
                class="compare ${this._compare ? 'active' : ''}"
                .path=${this._compare ? mdiCompareRemove : mdiCompare}
                @click=${this._toggleCompare}
                dense
                outlined
              >
                ${this._config.compare_button_label ?? this.hass.localize('ui.panel.lovelace.components.energy_period_selector.compare')}
              </ha-icon-button>`
            : this._config?.compare_button_type === 'text'
            ? renderButton(
                this._config.compare_button_label ?? this.hass.localize('ui.panel.lovelace.components.energy_period_selector.compare'),
                this._toggleCompare,
                `compare ${this._compare ? 'active' : ''}`,
              )
            : nothing}
        </div>
      </div>
    `;
  }

  private _parseDate(value: unknown): Date | undefined {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const date = parse(value, 'yyyy-MM-dd', new Date());
    return isValid(date) && format(date, 'yyyy-MM-dd') === value ? date : undefined;
  }

  public _startDateChanged(ev: CustomEvent): void {
    const date = this._parseDate(ev.detail?.value);
    if (date) this._setDate(date, this._endDate && this._endDate >= date ? this._endDate : date);
  }

  public _endDateChanged(ev: CustomEvent): void {
    const date = this._parseDate(ev.detail?.value);
    if (date && this._startDate) this._setDate(this._startDate, date < this._startDate ? this._startDate : date);
  }

  private _handleView(ev: CustomEvent): void {
    this._selectPeriod(ev.detail.value);
  }

  private _selectPeriod(period: EnergyPeriodSelectorBase['_period']): void {
    if (period === 'billing' && !this._config?.billing_cycle_day) return;
    this._period = period;
    const today = startOfToday();
    const start =
      !this._startDate ||
      isWithinInterval(today, {
        start: this._startDate,
        end: this._endDate || endOfToday(),
      })
        ? today
        : this._startDate;

    const weekStartsOn = firstWeekdayIndex(this.hass.locale);

    this._setDate(
      this._period === 'day'
        ? startOfDay(start)
        : this._period === 'week'
        ? startOfWeek(start, { weekStartsOn })
        : this._period === 'month'
        ? startOfMonth(start)
        : this._period === 'year'
        ? startOfYear(start)
        : this._period === 'billing'
        ? billingPeriodStart(today, this._config!.billing_cycle_day!)
        : this._startDate || startOfToday(),
      this._period === 'custom' ? this._endDate : undefined,
    );
  }

  private _pickToday() {
    const weekStartsOn = firstWeekdayIndex(this.hass.locale);

    this._setDate(
      this._period === 'day'
        ? startOfToday()
        : this._period === 'week'
        ? startOfWeek(new Date(), { weekStartsOn })
        : this._period === 'month'
        ? startOfMonth(new Date())
        : this._period === 'billing'
        ? billingPeriodStart(new Date(), this._config!.billing_cycle_day!)
        : startOfYear(new Date()),
    );
  }

  private _pickPrevious() {
    const newStart =
      this._period === 'day'
        ? addDays(this._startDate!, -1)
        : this._period === 'week'
        ? addWeeks(this._startDate!, -1)
        : this._period === 'month'
        ? addMonths(this._startDate!, -1)
        : this._period === 'year'
        ? addYears(this._startDate!, -1)
        : this._period === 'billing'
        ? addBillingPeriods(this._startDate!, -1)
        : addDays(this._startDate!, -1);
    this._setDate(newStart);
  }

  private _pickNext() {
    const newStart =
      this._period === 'day'
        ? addDays(this._startDate!, 1)
        : this._period === 'week'
        ? addWeeks(this._startDate!, 1)
        : this._period === 'month'
        ? addMonths(this._startDate!, 1)
        : this._period === 'year'
        ? addYears(this._startDate!, 1)
        : this._period === 'billing'
        ? addBillingPeriods(this._startDate!, 1)
        : addDays(this._startDate!, 1);
    this._setDate(newStart);
  }

  private _setDate(startDate: Date, customEndDate?: Date) {
    const weekStartsOn = firstWeekdayIndex(this.hass.locale);

    const endDate: Date =
      this._period === 'day'
        ? endOfDay(startDate)
        : this._period === 'week'
        ? endOfWeek(startDate, { weekStartsOn })
        : this._period === 'month'
        ? endOfMonth(startDate)
        : this._period === 'year'
        ? endOfYear(startDate)
        : this._period === 'billing'
        ? billingPeriodEnd(startDate)
        : this._period === 'custom' && customEndDate
        ? endOfDay(customEndDate)
        : this._endDate || endOfToday();

    const energyCollection = findEnergyCollection(this.hass, this.collectionKey);
    if (!energyCollection) return;
    energyCollection.setPeriod(startDate, endDate < startDate ? endOfDay(startDate) : endDate);
    energyCollection.refresh();
  }

  private _updateDates(energyData: EnergyDataLike): void {
    if (!isValid(energyData.start) || (energyData.end !== undefined && !isValid(energyData.end))) return;
    if (energyData.end && energyData.end < energyData.start) return;
    const datesChanged = this._startDate?.getTime() !== energyData.start.getTime() ||
      this._endDate?.getTime() !== (energyData.end || endOfToday()).getTime();
    this._energyData = energyData;
    this._compare = energyData.compareMode ? true : energyData.startCompare !== undefined;
    this._startDate = energyData.start;
    this._endDate = energyData.end || endOfToday();
    const dayDifference = differenceInDays(this._endDate, this._startDate || endOfToday());
    this._period =
      this._period === 'billing' && this._startDate.getDate() === this._config?.billing_cycle_day &&
        this._endDate!.getTime() === billingPeriodEnd(this._startDate).getTime()
        ? 'billing'
        : this._period !== 'custom'
        ? dayDifference < 1
          ? 'day'
          : dayDifference === 6
          ? 'week'
          : dayDifference > 26 && dayDifference < 31 // 28, 29, 30 or 31 days in a month
          ? 'month'
          : dayDifference === 364 || dayDifference === 365 // Leap year
          ? 'year'
          : 'custom'
        : 'custom';
    if (!this._defaultPeriodApplied) {
      // Set before setPeriod: collection subscriptions may notify synchronously.
      this._defaultPeriodApplied = true;
      if (this._config?.default_period && this._config.default_period !== 'day' && this._period === 'day' && this._startDate.getTime() === startOfToday().getTime()) {
        this._selectPeriod(this._config.default_period);
        return;
      }
    }
    if (datesChanged) this._scheduleEntitySync();
  }

  private _scheduleEntitySync(): void {
    clearTimeout(this._entitySyncTimer);
    this._entitySyncTimer = setTimeout(() => {
      this._entitySyncTimer = undefined;
      for (const boundary of ['start', 'end'] as const) {
        const entityId = this._config?.[boundary === 'start' ? 'start_date_entity' : 'end_date_entity'];
        const date = boundary === 'start' ? this._startDate : this._endDate;
        if (!entityId || !date) continue;
        const value: EntitySyncValue = {
          entityId,
          timestamp: date.getTime(),
          hasTime: this.hass.states[entityId]?.attributes.has_time === true,
        };
        const payload = entitySyncPayload(value, this._syncedDates[boundary]);
        if (!payload) continue;
        // Record the attempted change before invoking HA; failures warn without a retry loop.
        this._syncedDates[boundary] = value;
        try {
          void Promise.resolve(this.hass.callService('input_datetime', 'set_datetime', payload))
            .catch(error => console.warn('Energy Period Selector Plus: entity sync failed', error));
        } catch (error) {
          console.warn('Energy Period Selector Plus: entity sync failed', error);
        }
      }
    }, 500);
  }

  private _toggleCompare() {
    const energyCollection = findEnergyCollection(this.hass, this.collectionKey);
    if (!energyCollection || !this._energyData) return;
    const next = !this._compare;
    // Optimistic, so a second click before the refresh finishes toggles back; the next collection update corrects it.
    this._compare = next;
    energyCollection.setCompare('compareMode' in this._energyData ? (next ? this._config?.compare_mode ?? 'previous' : '') : next);
    energyCollection.refresh();
  }

  static styles = stylesBase;
}

declare global {
  interface HTMLElementTagNameMap {
    'energy-period-selector-base': EnergyPeriodSelectorBase;
  }
}
