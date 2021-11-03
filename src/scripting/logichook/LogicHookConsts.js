const LOGIC_HOOK_INCLUDE = 'INCLUDE'
module.exports = {
  LOGIC_HOOK_INCLUDE,
  DEFAULT_ASSERTERS: [
    { name: 'BUTTONS', className: 'ButtonsAsserter' },
    { name: 'BUTTONS_COUNT', className: 'ButtonsCountAsserter' },
    { name: 'BUTTONS_COUNT_REC', className: 'ButtonsCountRecAsserter' },
    { name: 'MEDIA', className: 'MediaAsserter' },
    { name: 'MEDIA_COUNT', className: 'MediaCountAsserter' },
    { name: 'MEDIA_COUNT_REC', className: 'MediaCountRecAsserter' },
    { name: 'CARDS', className: 'CardsAsserter' },
    { name: 'CARDS_COUNT', className: 'CardsCountAsserter' },
    { name: 'CARDS_COUNT_REC', className: 'CardsCountRecAsserter' },
    { name: 'PAUSE_ASSERTER', className: 'PauseAsserter' },
    { name: 'JSON_PATH', className: 'JsonPathAsserter' },
    { name: 'JSON_PATH_COUNT', className: 'JsonPathCountAsserter' },
    { name: 'RESPONSE_LENGTH', className: 'ResponseLengthAsserter' },
    { name: 'FORMS', className: 'FormsAsserter' },

    { name: 'ENTITIES', className: 'EntitiesAsserter' },
    { name: 'ENTITY_VALUES', className: 'EntityValuesAsserter' },
    { name: 'ENTITY_CONTENT', className: 'EntityContentAsserter' },

    { name: 'INTENT', className: 'IntentAsserter' },
    { name: 'INTENT_UNIQUE', className: 'IntentUniqueAsserter' },
    { name: 'INTENT_CONFIDENCE', className: 'IntentConfidenceAsserter' },

    { name: 'TEXT_CONTAINS_ANY', className: 'TextContainsAnyAsserter' },
    { name: 'TEXT_CONTAINS_ANY_IC', className: 'TextContainsAnyICAsserter' },
    { name: 'TEXT_CONTAINS_ALL', className: 'TextContainsAllAsserter' },
    { name: 'TEXT_CONTAINS_ALL_IC', className: 'TextContainsAllICAsserter' },
    { name: 'TEXT_WILDCARD_ANY', className: 'TextWildcardAnyAsserter' },
    { name: 'TEXT_WILDCARD_ANY_IC', className: 'TextWildcardAnyICAsserter' },
    { name: 'TEXT_WILDCARD_ALL', className: 'TextWildcardAllAsserter' },
    { name: 'TEXT_WILDCARD_ALL_IC', className: 'TextWildcardAllICAsserter' },
    { name: 'TEXT_WILDCARDEXACT_ANY', className: 'TextWildcardExactAnyAsserter' },
    { name: 'TEXT_WILDCARDEXACT_ANY_IC', className: 'TextWildcardExactAnyICAsserter' },
    { name: 'TEXT_WILDCARDEXACT_ALL', className: 'TextWildcardExactAllAsserter' },
    { name: 'TEXT_WILDCARDEXACT_ALL_IC', className: 'TextWildcardExactAllICAsserter' },
    { name: 'TEXT_REGEXP_ANY', className: 'TextRegexpAnyAsserter' },
    { name: 'TEXT_REGEXP_ANY_IC', className: 'TextRegexpAnyICAsserter' },
    { name: 'TEXT_REGEXP_ALL', className: 'TextRegexpAllAsserter' },
    { name: 'TEXT_REGEXP_ALL_IC', className: 'TextRegexpAllICAsserter' },
    { name: 'TEXT_EQUALS', className: 'TextEqualsAnyAsserter' },
    { name: 'TEXT_EQUALS_IC', className: 'TextEqualsAnyICAsserter' },
    { name: 'TEXT', className: 'TextEqualsAnyAsserter' },
    { name: 'TEXT_IC', className: 'TextEqualsAnyICAsserter' },

    { name: 'BOT_CONSUMED', className: 'BotRepliesConsumedAsserter' },
    { name: 'BOT_UNCONSUMED_COUNT', className: 'BotRepliesUnconsumedCountAsserter' }
  ],
  DEFAULT_LOGIC_HOOKS: [
    { name: 'PAUSE', className: 'PauseLogicHook' },
    { name: 'WAITFORBOT', className: 'WaitForBotLogicHook' },
    { name: 'SET_SCRIPTING_MEMORY', className: 'SetScriptingMemoryLogicHook' },
    { name: 'CLEAR_SCRIPTING_MEMORY', className: 'ClearScriptingMemoryLogicHook' },
    { name: 'ASSIGN_SCRIPTING_MEMORY', className: 'AssignScriptingMemoryLogicHook' },
    { name: 'UPDATE_CUSTOM', className: 'UpdateCustomLogicHook' },
    { name: 'SKIP_BOT_UNCONSUMED', className: 'ClearQueueLogicHook' },
    { name: LOGIC_HOOK_INCLUDE, className: 'IncludeLogicHook' }
  ],
  DEFAULT_USER_INPUTS: [
    { name: 'BUTTON', className: 'ButtonInput' },
    { name: 'MEDIA', className: 'MediaInput' },
    { name: 'FORM', className: 'FormInput' }
  ]
}
