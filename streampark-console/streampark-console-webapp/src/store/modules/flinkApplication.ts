import { defineStore } from 'pinia';

interface FlinkApplicationState {
  appId: Nullable<string>;
  formValue: Recordable;
}
export const useFlinkAppStore = defineStore({
  id: 'flink-application',
  state: (): FlinkApplicationState => {
    const storedFormValue = sessionStorage.getItem('Flink_JOB_FORM');
    let initialValue: Recordable = {};
    if (storedFormValue) {
      try {
        initialValue = JSON.parse(storedFormValue);
      } catch (error) {
        console.error('Error parsing form value:', error);
      }
    }
    return {
      appId: null,
      formValue: initialValue,
    };
  },
  getters: {
    getApplicationId(): Nullable<string> {
      return this.appId;
    },
    getFlinkFormValue(): Recordable {
      return this.formValue;
    },
  },
  actions: {
    setApplicationId(appId: string): void {
      this.appId = appId;
    },
    clearApplicationId() {
      this.appId = null;
    },
    setFlinkFormValue(value: Recordable): void {
      this.formValue = { ...this.formValue, ...value };
      sessionStorage.setItem('Flink_JOB_FORM', JSON.stringify(this.formValue));
    },
    clearFlinkFormValue() {
      this.formValue = {};
      sessionStorage.removeItem('Flink_JOB_FORM');
    },
  },
});
