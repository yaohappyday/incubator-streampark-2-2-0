<!--
  Licensed to the Apache Software Foundation (ASF) under one or more
  contributor license agreements.  See the NOTICE file distributed with
  this work for additional information regarding copyright ownership.
  The ASF licenses this file to You under the Apache License, Version 2.0
  (the "License"); you may not use this file except in compliance with
  the License.  You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->
<template>
  <BasicDrawer
    class="app_controller app-drawer-margin app-drawer-footer-bottom"
    :showCancelBtn="false"
    :okText="t('common.closeText')"
    closeType="closeBtnValidate"
    @register="registerDrawer"
    showFooter
    width="50%"
    @ok="handleSubmit"
    @close="handleSubmit"
  >
    <template #title>
      <Icon icon="ant-design:user-add-outlined" />
      {{ getTitle }}
    </template>
    <BasicForm ref="form" @register="registerForm" :schemas="props.schema">
    </BasicForm>
  </BasicDrawer>
</template>
<script lang="ts">
  export default defineComponent({
    name: 'AddConfigDrawer',
  });
</script>
<script setup lang="ts" name="AddConfigDrawer">
  import { computed, defineComponent, ref, unref, reactive } from 'vue';
  import { BasicForm, useForm, FormSchema } from '/@/components/Form';
  import { FormTypeEnum } from '/@/enums/formEnum';
  
  import { BasicDrawer, useDrawerInner } from '/@/components/Drawer';
  import { handleFormValue } from '../utils';
  import { useEdit } from '../hooks/useEdit';
  import Icon from '/@/components/Icon';
  import { useI18n } from '/@/hooks/web/useI18n';
  import { AppListRecord } from '/@/api/flink/app.type';
  import { useMessage } from '/@/hooks/web/useMessage';
  import { useFlinkAppStore } from '/@/store/modules/flinkApplication';

    const emit = defineEmits(['addSubmitResult', 'register', 'addConfigFailed']);
    const props = defineProps({
      schema: {
        type: Array as PropType<FormSchema[]>
      }
    });
      const { t } = useI18n();
      const formType = ref(FormTypeEnum.Edit);
      const app = reactive<Partial<AppListRecord>>({});
      let oldSessionData = reactive<Partial<AppListRecord>>({});
      const flinkAppStore = useFlinkAppStore();
      const { createMessage } = useMessage();
      const { handleResetApplication, memoryItems } = useEdit();
      const [registerForm, { setFieldsValue, clearValidate, validateFields }] = useForm({
        name: 'MemberForm',
        colon: true,
        showActionButtonGroup: false,
        baseColProps: { span: 24 },
        labelCol: { lg: { span: 5, offset: 0 }, sm: { span: 7, offset: 0 } },
        wrapperCol: { lg: { span: 16, offset: 0 }, sm: { span: 17, offset: 0 } },
      });

      const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data) => {
        clearValidate();
        setDrawerProps({
          confirmLoading: false
        });
        const resetValues = {
          dynamicProperties: data.dynamicProperties,
          parallelism: data.parallelism,
          resolveOrder: data.resolveOrder,
          slot: data.slot,
          tags: data.tags,
          options: data.options
        }
        oldSessionData = data
        Object.assign(app, resetValues);
        memoryItems.totalItems = []
        memoryItems.jmMemoryItems = []
        memoryItems.tmMemoryItems = []
        const resetOption = handleResetApplication(resetValues)
        setFieldsValue({...resetValues, ...resetOption})
      });

      const getTitle = computed(() => {
        return {
          [FormTypeEnum.Edit]: t('flink.app.addDrawerMenu.editConfig')
        }[unref(formType)];
      });
      let isSubmitConfig = ref(false)
      async function handleSubmit() {
        try {
          const values = await validateFields();
          setDrawerProps({ confirmLoading: true });
          const options = handleFormValue({...oldSessionData, ...values}) // 把所选内存整合成一个options对象
          // const resetOption = handleResetApplication({...values, options}) // 把options对象拆解成form表单所需字段
          console.log(oldSessionData)
          const params = handleConfigSubmitParams(oldSessionData,values)
          flinkAppStore.setFlinkFormValue({...params, options: JSON.stringify(options)})
          isSubmitConfig.value = true
          closeDrawer();
          emit('addSubmitResult', 'config');
        } catch (e) {
          createMessage.warning(t('flink.app.addDrawerMenu.configValidateTips'))
          isSubmitConfig.value = false
          emit('addConfigFailed', {type: 'config'});
        } finally {
          setDrawerProps({ confirmLoading: false });
        }
      }
      function handleConfigSubmitParams(data, values) {
        const newValues = {}
        for (const k in values) {
          if ((k.startsWith('jobmanager_memory_')) && (values[k] === undefined || values[k] === null)) {
          
          } else if ((k.startsWith('taskmanager_memory_')) && (values[k] === undefined || values[k] === null)) {
            
          } else {
            newValues[k] = values[k]
          }
        }
        const a = {...data, ...newValues}
        return a
      }
      // 自定义验证form表单
      // const checkFormValidation = (formData: Recordable) => {
      //   isSubmitConfig.value = true
      //   if (!formData.hasOwnProperty('resolveOrder') || formData.resolveOrder == undefined || formData.resolveOrder == null) {
      //     isSubmitConfig.value = false
      //     emit('addConfigFailed', 'config');
      //   }
      // }
    
  
</script>
<style lang="less">
  @import url('../styles/Add.less');
</style>
  