module.exports = {
  PROJECTNAME: 'PROJECTNAME',
  TESTSESSIONNAME: 'TESTSESSIONNAME',
  TEMPDIR: 'TEMPDIR',
  CLEANUPTEMPDIR: 'CLEANUPTEMPDIR',
  WAITFORBOTTIMEOUT: 'WAITFORBOTTIMEOUT',
  CONTAINERMODE: 'CONTAINERMODE',
  PLUGINMODULEPATH: 'PLUGINMODULEPATH',
  // falsy or ms/keystroke
  SIMULATE_WRITING_SPEED: 'SIMULATE_WRITING_SPEED',
  DOCKERCOMPOSEPATH: 'DOCKERCOMPOSEPATH',
  DOCKERMACHINEPATH: 'DOCKERMACHINEPATH',
  DOCKERMACHINE: 'DOCKERMACHINE',
  DOCKERIMAGE: 'DOCKERIMAGE',
  DOCKERUNIQUECONTAINERNAMES: 'DOCKERUNIQUECONTAINERNAMES',
  DOCKERSYSLOGPORT: 'DOCKERSYSLOGPORT',
  DOCKERSYSLOGPORT_RANGE: 'DOCKERSYSLOGPORT_RANGE',
  BOTIUMGRIDURL: 'BOTIUMGRIDURL',
  BOTIUMAPITOKEN: 'BOTIUMAPITOKEN',
  BOTIUMGRIDSLOT: 'BOTIUMGRIDSLOT',
  // General Mocker Settings
  BOT_HEALTH_STATUS: 'BOT_HEALTH_STATUS',
  BOT_HEALTH_CHECK_PATH: 'BOT_HEALTH_CHECK_PATH',
  BOT_HEALTH_CHECK_VERB: 'BOT_HEALTH_CHECK_VERB',
  // Facebook Mocker Settings
  FACEBOOK_API: 'FACEBOOK_API',
  FACEBOOK_WEBHOOK_PORT: 'FACEBOOK_WEBHOOK_PORT',
  FACEBOOK_WEBHOOK_PATH: 'FACEBOOK_WEBHOOK_PATH',
  FACEBOOK_PUBLISHPORT: 'FACEBOOK_PUBLISHPORT',
  FACEBOOK_PUBLISHPORT_RANGE: 'FACEBOOK_PUBLISHPORT_RANGE',
  FACEBOOK_SEND_DELIVERY_CONFIRMATION: 'FACEBOOK_SEND_DELIVERY_CONFIRMATION',
  // Slack Mocker Settings
  SLACK_API: 'SLACK_API',
  SLACK_EVENT_PORT: 'SLACK_EVENT_PORT',
  SLACK_EVENT_PATH: 'SLACK_EVENT_PATH',
  SLACK_OAUTH_PORT: 'SLACK_OAUTH_PORT',
  SLACK_OAUTH_PATH: 'SLACK_OAUTH_PATH',
  SLACK_PUBLISHPORT: 'SLACK_PUBLISHPORT',
  SLACK_PUBLISHPORT_RANGE: 'SLACK_PUBLISHPORT_RANGE',
  // Bot Framework Mocker Settings
  BOTFRAMEWORK_API: 'BOTFRAMEWORK_API',
  BOTFRAMEWORK_APP_ID: 'BOTFRAMEWORK_APP_ID',
  BOTFRAMEWORK_CHANNEL_ID: 'BOTFRAMEWORK_CHANNEL_ID',
  BOTFRAMEWORK_WEBHOOK_PORT: 'BOTFRAMEWORK_WEBHOOK_PORT',
  BOTFRAMEWORK_WEBHOOK_PATH: 'BOTFRAMEWORK_WEBHOOK_PATH',
  BOTFRAMEWORK_PUBLISHPORT: 'BOTFRAMEWORK_PUBLISHPORT',
  BOTFRAMEWORK_PUBLISHPORT_RANGE: 'BOTFRAMEWORK_PUBLISHPORT_RANGE',

  // Simple Reset Bot Settings
  SIMPLEREST_PING_URL: 'SIMPLEREST_PING_URL',
  SIMPLEREST_PING_VERB: 'SIMPLEREST_PING_VERB',
  SIMPLEREST_PING_BODY: 'SIMPLEREST_PING_BODY',
  SIMPLEREST_PING_BODY_RAW: 'SIMPLEREST_PING_BODY_RAW',
  SIMPLEREST_PING_HEADERS: 'SIMPLEREST_PING_HEADERS',
  SIMPLEREST_PING_RETRIES: 'SIMPLEREST_PING_RETRIES',
  SIMPLEREST_PING_TIMEOUT: 'SIMPLEREST_PING_TIMEOUT',
  SIMPLEREST_PING_UPDATE_CONTEXT: 'SIMPLEREST_PING_UPDATE_CONTEXT',
  SIMPLEREST_STOP_URL: 'SIMPLEREST_STOP_URL',
  SIMPLEREST_STOP_VERB: 'SIMPLEREST_STOP_VERB',
  SIMPLEREST_STOP_BODY: 'SIMPLEREST_STOP_BODY',
  SIMPLEREST_STOP_BODY_RAW: 'SIMPLEREST_STOP_BODY_RAW',
  SIMPLEREST_STOP_HEADERS: 'SIMPLEREST_STOP_HEADERS',
  SIMPLEREST_STOP_RETRIES: 'SIMPLEREST_STOP_RETRIES',
  SIMPLEREST_STOP_TIMEOUT: 'SIMPLEREST_STOP_TIMEOUT',
  SIMPLEREST_INIT_CONTEXT: 'SIMPLEREST_INIT_CONTEXT',
  SIMPLEREST_INIT_TEXT: 'SIMPLEREST_INIT_TEXT',
  SIMPLEREST_PROXY_URL: 'SIMPLEREST_PROXY_URL',
  SIMPLEREST_STRICT_SSL: 'SIMPLEREST_STRICT_SSL',
  SIMPLEREST_URL: 'SIMPLEREST_URL',
  SIMPLEREST_EXTRA_OPTIONS: 'SIMPLEREST_EXTRA_OPTIONS',
  SIMPLEREST_TIMEOUT: 'SIMPLEREST_TIMEOUT',
  SIMPLEREST_METHOD: 'SIMPLEREST_METHOD',
  SIMPLEREST_VERB: 'SIMPLEREST_VERB',
  SIMPLEREST_HEADERS_TEMPLATE: 'SIMPLEREST_HEADERS_TEMPLATE',
  SIMPLEREST_BODY_TEMPLATE: 'SIMPLEREST_BODY_TEMPLATE',
  SIMPLEREST_BODY_RAW: 'SIMPLEREST_BODY_RAW',
  SIMPLEREST_START_HOOK: 'SIMPLEREST_START_HOOK',
  SIMPLEREST_STOP_HOOK: 'SIMPLEREST_STOP_HOOK',
  SIMPLEREST_REQUEST_HOOK: 'SIMPLEREST_REQUEST_HOOK',
  SIMPLEREST_POLL_URL: 'SIMPLEREST_POLL_URL',
  SIMPLEREST_POLL_VERB: 'SIMPLEREST_POLL_VERB',
  SIMPLEREST_POLL_BODY: 'SIMPLEREST_POLL_BODY',
  SIMPLEREST_POLL_BODY_RAW: 'SIMPLEREST_POLL_BODY_RAW',
  SIMPLEREST_POLL_HEADERS: 'SIMPLEREST_POLL_HEADERS',
  SIMPLEREST_POLL_INTERVAL: 'SIMPLEREST_POLL_INTERVAL',
  SIMPLEREST_POLL_TIMEOUT: 'SIMPLEREST_PING_TIMEOUT',
  SIMPLEREST_POLL_UPDATE_CONTEXT: 'SIMPLEREST_POLL_UPDATE_CONTEXT',
  SIMPLEREST_BODY_JSONPATH: 'SIMPLEREST_BODY_JSONPATH',
  SIMPLEREST_RESPONSE_JSONPATH: 'SIMPLEREST_RESPONSE_JSONPATH',
  SIMPLEREST_RESPONSE_HOOK: 'SIMPLEREST_RESPONSE_HOOK',
  SIMPLEREST_MEDIA_JSONPATH: 'SIMPLEREST_MEDIA_JSONPATH',
  SIMPLEREST_BUTTONS_JSONPATH: 'SIMPLEREST_BUTTONS_JSONPATH',
  SIMPLEREST_CONTEXT_JSONPATH: 'SIMPLEREST_CONTEXT_JSONPATH',
  SIMPLEREST_CONTEXT_MERGE_OR_REPLACE: 'SIMPLEREST_CONTEXT_MERGE_OR_REPLACE',
  SIMPLEREST_CONVERSATION_ID_TEMPLATE: 'SIMPLEREST_CONVERSATION_ID_TEMPLATE',
  SIMPLEREST_STEP_ID_TEMPLATE: 'SIMPLEREST_STEP_ID_TEMPLATE',
  SIMPLEREST_INBOUND_REDISURL: 'SIMPLEREST_INBOUND_REDISURL',
  SIMPLEREST_INBOUND_ENDPOINT: 'SIMPLEREST_INBOUND_ENDPOINT',
  SIMPLEREST_INBOUND_PORT: 'SIMPLEREST_INBOUND_PORT',
  SIMPLEREST_INBOUND_SELECTOR_JSONPATH: 'SIMPLEREST_INBOUND_SELECTOR_JSONPATH',
  SIMPLEREST_INBOUND_SELECTOR_VALUE: 'SIMPLEREST_INBOUND_SELECTOR_VALUE',
  SIMPLEREST_INBOUND_UPDATE_CONTEXT: 'SIMPLEREST_INBOUND_UPDATE_CONTEXT',
  // Script Compiler
  SCRIPTING_TXT_EOL: 'SCRIPTING_TXT_EOL',
  // ROW_PER_MESSAGE or QUESTION_ANSWER
  SCRIPTING_XLSX_MODE: 'SCRIPTING_XLSX_MODE',
  SCRIPTING_XLSX_EOL_WRITE: 'SCRIPTING_XLSX_EOL_WRITE',
  SCRIPTING_XLSX_STARTROW: 'SCRIPTING_XLSX_STARTROW',
  SCRIPTING_XLSX_STARTCOL: 'SCRIPTING_XLSX_STARTCOL',
  SCRIPTING_XLSX_HASHEADERS: 'SCRIPTING_XLSX_HASHEADERS',
  SCRIPTING_XLSX_SHEETNAMES: 'SCRIPTING_XLSX_SHEETNAMES',
  SCRIPTING_XLSX_SHEETNAMES_PCONVOS: 'SCRIPTING_XLSX_SHEETNAMES_PCONVOS',
  SCRIPTING_XLSX_SHEETNAMES_UTTERANCES: 'SCRIPTING_XLSX_SHEETNAMES_UTTERANCES',
  SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY: 'SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY',
  SCRIPTING_CSV_DELIMITER: 'SCRIPTING_CSV_DELIMITER',
  SCRIPTING_CSV_SKIP_HEADER: 'SCRIPTING_CSV_SKIP_HEADER',
  SCRIPTING_CSV_QUOTE: 'SCRIPTING_CSV_QUOTE',
  SCRIPTING_CSV_ESCAPE: 'SCRIPTING_CSV_ESCAPE',
  SCRIPTING_CSV_MULTIROW_COLUMN_CONVERSATION_ID: 'SCRIPTING_CSV_MULTIROW_COLUMN_CONVERSATION_ID',
  SCRIPTING_CSV_MULTIROW_COLUMN_SENDER: 'SCRIPTING_CSV_MULTIROW_COLUMN_SENDER',
  SCRIPTING_CSV_MULTIROW_COLUMN_TEXT: 'SCRIPTING_CSV_MULTIROW_COLUMN_TEXT',
  SCRIPTING_CSV_QA_COLUMN_QUESTION: 'SCRIPTING_CSV_QA_COLUMN_QUESTION',
  SCRIPTING_CSV_QA_COLUMN_ANSWER: 'SCRIPTING_CSV_QA_COLUMN_ANSWER',
  SCRIPTING_NORMALIZE_TEXT: 'SCRIPTING_NORMALIZE_TEXT',
  SCRIPTING_ENABLE_MEMORY: 'SCRIPTING_ENABLE_MEMORY',
  SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS: 'SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS',
  // regexp, regexpIgnoreCase, wildcard, wildcardIgnoreCase, include, includeIgnoreCase, equals
  SCRIPTING_MATCHING_MODE: 'SCRIPTING_MATCHING_MODE',
  // all, first, random
  SCRIPTING_UTTEXPANSION_MODE: 'SCRIPTING_UTTEXPANSION_MODE',
  SCRIPTING_UTTEXPANSION_RANDOM_COUNT: 'SCRIPTING_UTTEXPANSION_RANDOM_COUNT',
  SCRIPTING_UTTEXPANSION_INCOMPREHENSION: 'SCRIPTING_UTTEXPANSION_INCOMPREHENSION',
  SCRIPTING_UTTEXPANSION_USENAMEASINTENT: 'SCRIPTING_UTTEXPANSION_USENAMEASINTENT',
  // Del original convo or not
  SCRIPTING_MEMORYEXPANSION_KEEP_ORIG: 'SCRIPTING_MEMORYEXPANSION_KEEP_ORIG',
  // word, non_whitespace, joker
  SCRIPTING_MEMORY_MATCHING_MODE: 'SCRIPTING_MEMORY_MATCHING_MODE',
  // Botium Lifecycle Hooks
  CUSTOMHOOK_ONBUILD: 'CUSTOMHOOK_ONBUILD',
  CUSTOMHOOK_ONSTART: 'CUSTOMHOOK_ONSTART',
  CUSTOMHOOK_ONUSERSAYS: 'CUSTOMHOOK_ONUSERSAYS',
  CUSTOMHOOK_ONBOTRESPONSE: 'CUSTOMHOOK_ONBOTRESPONSE',
  CUSTOMHOOK_ONSTOP: 'CUSTOMHOOK_ONSTOP',
  CUSTOMHOOK_ONCLEAN: 'CUSTOMHOOK_ONCLEAN',
  // Extension components
  ASSERTERS: 'ASSERTERS',
  LOGIC_HOOKS: 'LOGIC_HOOKS',
  USER_INPUTS: 'USER_INPUTS',
  // API Calls Rate Limiting
  RATELIMIT_USERSAYS_MAXCONCURRENT: 'RATELIMIT_RATELIMIT_USERSAYS_MAXCONCURRENTMAXCONCURRENT',
  RATELIMIT_USERSAYS_MINTIME: 'RATELIMIT_USERSAYS_MINTIME',
  SECURITY_ALLOW_UNSAFE: 'SECURITY_ALLOW_UNSAFE'
}
