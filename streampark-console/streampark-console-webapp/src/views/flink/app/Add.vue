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
<script lang="ts">
  export default {
    name: 'AppCreate',
  };
</script>
<script setup lang="ts" name="AppCreate">
  import { useGo } from '/@/hooks/web/usePage';
  import ProgramArgs from './components/ProgramArgs.vue';
  // import { Switch } from 'ant-design-vue';
  import { onMounted, onBeforeUnmount, reactive, ref, unref } from 'vue';
  import { PageWrapper } from '/@/components/Page';
  import { createAsyncComponent } from '/@/utils/factory/createAsyncComponent';
  import { useFlinkAppStore } from '/@/store/modules/flinkApplication';

  import { BasicForm, useForm } from '/@/components/Form';
  // import { SettingTwoTone } from '@ant-design/icons-vue';
  import { useDrawer } from '/@/components/Drawer';
  // import Mergely from './components/Mergely.vue';
  // import { handleConfTemplate } from '/@/api/flink/config';
  import { fetchAppConf, fetchCreate } from '/@/api/flink/app';
  import options from './data/option';
  import { useCreateSchema } from './hooks/useCreateSchema';
  import { getAppConfType, handleSubmitParams } from './utils';
  import { useMessage } from '/@/hooks/web/useMessage';
  import { createLocalStorage } from '/@/utils/cache';
  import { buildUUID } from '/@/utils/uuid';
  import { useI18n } from '/@/hooks/web/useI18n';
  import VariableReview from './components/VariableReview.vue';
  // import PomTemplateTab from './components/PodTemplate/PomTemplateTab.vue';
  // import UseSysHadoopConf from './components/UseSysHadoopConf.vue';
  import { AppListRecord, CreateParams } from '/@/api/flink/app.type';
  import { decodeByBase64, encryptByBase64 } from '/@/utils/cipher';
  import SidebarMenu from './components/SidebarMenu.vue';
  import AddAttrDrawer from './components/AddAttrDrawer.vue';
  import AddConfigDrawer from './components/AddConfigDrawer.vue';
  import {
    AppTypeEnum,
    ClusterStateEnum,
    ExecModeEnum,
    JobTypeEnum,
    ResourceFromEnum,
  } from '/@/enums/flinkEnum';

  const FlinkSqlEditor = createAsyncComponent(() => import('./components/FlinkSql.vue'), {
    loading: true,
  });
  // const Dependency = createAsyncComponent(() => import('./components/Dependency.vue'), {
  //   loading: true,
  // });

  const go = useGo();
  const flinkSql = ref();
  const dependencyRef = ref();
  const submitLoading = ref(false);
  const flinkAppStore = useFlinkAppStore();
  // const isShow = ref(false)

  const { t } = useI18n();
  const { createMessage } = useMessage();
  const optionsKeyMapping = new Map();
  const ls = createLocalStorage();
  options.forEach((item) => {
    optionsKeyMapping.set(item.key, item);
  });

  const app = reactive<Partial<AppListRecord>>({});
  const attributeForm = ref<InstanceType<typeof AddAttrDrawer> | null>(null)
  const isAttrfailMsgActive = ref(false)

  const k8sTemplate = reactive({
    podTemplate: '',
    jmPodTemplate: '',
    tmPodTemplate: '',
  });

  const attrVisible = ref(false);
  const configVisible = ref(false);

  const {
    flinkEnvs,
    flinkClusters,
    getMainOtherCreateFormSchema,
    getAttrCreateFormSchema,
    getConfigCreateFormSchema,
    suggestions,
  } = useCreateSchema(dependencyRef, true);

  const [registerAppForm, { setFieldsValue, submit }] = useForm({
    labelCol: { lg: { span: 5, offset: 0 }, sm: { span: 7, offset: 0 } },
    wrapperCol: { lg: { span: 16, offset: 0 }, sm: { span: 17, offset: 0 } },
    baseColProps: { span: 24 },
    colon: true,
    showActionButtonGroup: false,
  });

  // const [registerConfDrawer, { openDrawer: openConfDrawer }] = useDrawer();
  const [registerReviewDrawer, { openDrawer: openReviewDrawer }] = useDrawer();
  const [registerAttrDrawer, { openDrawer: openAttrDrawer, closeDrawer: closeAttrDrawer }] = useDrawer();
  const [registerConfigureDrawer, { openDrawer: openConfigureDrawer, closeDrawer: closeConfigureDrawer }] = useDrawer();

  /* Initialize the form */
  async function handleInitForm() {
    Object.assign(app, flinkAppStore.getFlinkFormValue);
    const defaultValue = {
      resolveOrder: 0,
      k8sRestExposedType: 0,
    };
    options.forEach((item) => {
      defaultValue[item.key] = item.defaultValue;
    });
    Object.assign(defaultValue, { versionId: app.versionId });
    await setFieldsValue({ ...app, ...defaultValue });
  }

  function handleCluster(values: Recordable) {
    let flinkClusterId =
      values.executionMode == ExecModeEnum.YARN_SESSION
        ? values.yarnSessionClusterId
        : values.flinkClusterId;
    const cluster =
      unref(flinkClusters).filter((c) => {
        if (flinkClusterId) {
          return c.id == flinkClusterId && c.clusterState === ClusterStateEnum.RUNNING;
        }
      })[0] || null;
    if (cluster) {
      Object.assign(values, { flinkClusterId: cluster.id });
      if (values.executionMode == ExecModeEnum.KUBERNETES_SESSION) {
        Object.assign(values, { clusterId: cluster.clusterId });
      }
    }
  }

  /* custom mode */
  async function handleSubmitCustomJob(values) {
    handleCluster(values);
    // Trigger a pom confirmation operation.
    await unref(dependencyRef)?.handleApplyPom();
    // common params...
    const dependency: { pom?: string; jar?: string } = {};
    const dependencyRecords = unref(dependencyRef)?.dependencyRecords;
    const uploadJars = unref(dependencyRef)?.uploadJars;
    if (unref(dependencyRecords) && unref(dependencyRecords).length > 0) {
      Object.assign(dependency, {
        pom: unref(dependencyRecords),
      });
    }
    if (uploadJars && unref(uploadJars).length > 0) {
      Object.assign(dependency, {
        jar: unref(uploadJars),
      });
    }
    const params = {
      jobType: values.jobType,
      projectId: values.project || null,
      module: values.module || null,
      dependency:
        dependency.pom === undefined && dependency.jar === undefined
          ? null
          : JSON.stringify(dependency),
      appType: values.appType,
    };
    handleSubmitParams(params, values, k8sTemplate);
    // common params...
    const resourceFrom = values.resourceFrom;
    if (resourceFrom) {
      if (resourceFrom == ResourceFromEnum.PROJECT) {
        params['resourceFrom'] = ResourceFromEnum.PROJECT;
        //streampark flink
        if (values.appType == AppTypeEnum.STREAMPARK_FLINK) {
          const configVal = values.config;
          params['format'] = getAppConfType(configVal);
          if (values.configOverride == null) {
            params['config'] = await fetchAppConf({
              config: configVal,
            });
          } else {
            params['config'] = decodeByBase64(values.configOverride);
          }
        } else {
          params['jar'] = values.jar || null;
          params['mainClass'] = values.mainClass || null;
        }
        console.log("submitParmas", params)
        handleCreateApp(params);
      } else {
        // from upload
        Object.assign(params, {
          resourceFrom: ResourceFromEnum.UPLOAD,
          appType: AppTypeEnum.APACHE_FLINK,
          jar: values.uploadJobJar,
          mainClass: values.mainClass,
        });
        handleCreateApp(params);
      }
    }
  }
  /* flink sql mode */
  async function handleSubmitSQL(values: Recordable) {
    // Trigger a pom confirmation operation.
    await unref(dependencyRef)?.handleApplyPom();
    // common params...
    const dependency: { pom?: string; jar?: string } = {};
    const dependencyRecords = unref(dependencyRef)?.dependencyRecords;
    const uploadJars = unref(dependencyRef)?.uploadJars;
    if (unref(dependencyRecords) && unref(dependencyRecords).length > 0) {
      Object.assign(dependency, {
        pom: unref(dependencyRecords),
      });
    }
    if (uploadJars && unref(uploadJars).length > 0) {
      Object.assign(dependency, {
        jar: unref(uploadJars),
      });
    }

    let config = values.configOverride;
    if (config != null && config !== undefined && config.trim() != '') {
      config = encryptByBase64(config);
    } else {
      config = null;
    }
    console.log("dependency", dependency)
    handleCluster(values);
    const params = {
      jobType: JobTypeEnum.SQL,
      flinkSql: values.flinkSql,
      appType: AppTypeEnum.STREAMPARK_FLINK,
      config,
      format: values.isSetConfig ? 1 : null,
      teamResource: JSON.stringify(values.teamResource),
      dependency: values.dependency
    };
    handleSubmitParams(params, values, k8sTemplate);
    handleCreateApp(params);
  }
  /* Submit to create */
  async function handleAppCreate(formValue: Recordable) {
    try {
      Object.assign(app, flinkAppStore.getFlinkFormValue)
      formValue = {...app, formValue} 
      submitLoading.value = true;
      k8sTemplate.podTemplate = formValue.k8sTemplate?.podTemplate ?? ''
      k8sTemplate.jmPodTemplate = formValue.k8sTemplate?.jmPodTemplate ?? ''
      k8sTemplate.tmPodTemplate = formValue.k8sTemplate?.tmPodTemplate ?? ''
      if (formValue.jobType == JobTypeEnum.SQL) {
        if (formValue.flinkSql == null || formValue.flinkSql.trim() === '') {
          createMessage.warning(t('flink.app.editStreamPark.flinkSqlRequired'));
        } else {
          const access = await flinkSql?.value?.handleVerifySql();
          if (!access) {
            createMessage.warning(t('flink.app.editStreamPark.sqlCheck'));
            throw new Error(access);
          }
        }
        handleSubmitSQL(formValue);
      } else {
        handleSubmitCustomJob(formValue);
      }
    } catch (error) {
      submitLoading.value = false;
    }
  }
  /* send create request */
  async function handleCreateApp(params: Recordable) {
    const param = {};
    for (const k in params) {
      const v = params[k];
      if (v != null && v !== undefined) {
        param[k] = v;
      }
    }
    const socketId = buildUUID();
    ls.set('DOWN_SOCKET_ID', socketId);
    Object.assign(param, { socketId });
    const { data } = await fetchCreate(param as CreateParams);
    submitLoading.value = false;
    if (data.data) {
      go('/flink/app');
    } else {
      createMessage.error(data.message);
    }
  }

  /** slideMenu */
  async function handleEdit(type: string) {
    if(attrVisible.value) {
      await attributeForm.value?.handleSubmit()
      if (isAttrfailMsgActive.value) return
    }
    Object.assign(app, flinkAppStore.getFlinkFormValue)
    if (type === 'attr') {
      configVisible.value = false
      attrVisible.value = true
      closeConfigureDrawer()
      openAttrDrawer(true, app)
    } else {
      attrVisible.value = false
      configVisible.value = true
      closeAttrDrawer()
      openConfigureDrawer(true, app);
    }
  }

  function addSlideSubmitResult(params) {
    const { type, value} = params
    isAttrfailMsgActive.value = false
    if (type === 'fail' && value === 'attr') {
      isAttrfailMsgActive.value = true
    }
  }

  onMounted(async () => {
    handleInitForm();
  });
  onBeforeUnmount(() => {
    flinkAppStore.clearFlinkFormValue();
  });
</script>

<template>
  <div>
    <PageWrapper
      contentFullHeight
      contentBackground
      contentClass="p-26px app_controller app-content-margin-right"
    >
      <BasicForm
        @register="registerAppForm"
        @submit="handleAppCreate"
        :schemas="getMainOtherCreateFormSchema"
        :model="app"
      >
        <template #flinkSql="{ model, field }">
          <FlinkSqlEditor
            ref="flinkSql"
            v-model:value="model[field]"
            :versionId="model['versionId']"
            :suggestions="suggestions"
            @preview="(value) => openReviewDrawer(true, { value, suggestions })"
          />
        </template>
        <template #args="{ model }">
          <template v-if="model.args !== undefined">
            <ProgramArgs
              v-model:value="model.args"
              :suggestions="suggestions"
              @preview="(value) => openReviewDrawer(true, { value, suggestions })"
            />
          </template>
        </template>
        <template #formFooter>
          <div class="flex items-center w-full justify-end">
            <a-button @click="go('/flink/app')">
              {{ t('common.cancelText') }}
            </a-button>
            <a-button class="ml-4" :loading="submitLoading" type="primary" @click="submit()">
              {{ t('common.submitText') }}
            </a-button>
          </div>
        </template>
      </BasicForm>
      <VariableReview @register="registerReviewDrawer" />
      <SidebarMenu
        :attrVisible="attrVisible"
        :configVisible="configVisible"
        @openDrawer="handleEdit"
      />
    </PageWrapper>
    <AddAttrDrawer
      ref="attributeForm"
      :flinkEnvs="flinkEnvs"
      :schema="getAttrCreateFormSchema"
      @register="registerAttrDrawer"
      @addSubmitResult="addSlideSubmitResult"
    />
    <AddConfigDrawer
      ref="configForm"
      :schema="getConfigCreateFormSchema"
      @register="registerConfigureDrawer"
    />
  </div>
</template>
<style lang="less">
  @import url('./styles/Add.less');
</style>
