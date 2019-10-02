const LOGIC_HOOK_INCLUDE = 'INCLUDE'
module.exports = {
  LOGIC_HOOK_INCLUDE,
  DEFAULT_ASSERTERS: [
    { name: 'BUTTONS', className: 'ButtonsAsserter' },
    { name: 'MEDIA', className: 'MediaAsserter' },
    { name: 'CARDS', className: 'CardsAsserter' },
    { name: 'PAUSE_ASSERTER', className: 'PauseAsserter' },
    { name: 'ENTITIES', className: 'EntitiesAsserter' },
    { name: 'ENTITY_VALUES', className: 'EntityValuesAsserter' },
    { name: 'INTENT', className: 'IntentAsserter' },
    { name: 'INTENT_UNIQUE', className: 'IntentUniqueAsserter' },
    { name: 'INTENT_CONFIDENCE', className: 'IntentConfidenceAsserter' },
    { name: 'JSON_PATH', className: 'JsonPathAsserter' },
    { name: 'RESPONSE_LENGTH', className: 'ResponseLengthAsserter' }
  ],
  DEFAULT_LOGIC_HOOKS: [
    { name: 'PAUSE', className: 'PauseLogicHook' },
    { name: 'WAITFORBOT', className: 'WaitForBotLogicHook' },
    { name: 'SET_SCRIPTING_MEMORY', className: 'SetScriptingMemoryLogicHook' },
    { name: 'CLEAR_SCRIPTING_MEMORY', className: 'ClearScriptingMemoryLogicHook' },
    { name: 'UPDATE_CUSTOM', className: 'UpdateCustomLogicHook' },
    { name: LOGIC_HOOK_INCLUDE, className: 'IncludeLogicHook' }
  ],
  DEFAULT_USER_INPUTS: [
    { name: 'BUTTON', className: 'ButtonInput' },
    { name: 'MEDIA', className: 'MediaInput' },
    { name: 'FORM', className: 'FormInput' }
  ]
}
