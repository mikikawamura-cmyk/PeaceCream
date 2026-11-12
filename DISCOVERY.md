# Discovery quiz implementation and pilot guide

Open `http://127.0.0.1:4173/?v=quiz-v2#discover`. The existing quick creator remains at `#create` and keeps its separate state. Both use the same photographic renderer and PNG card function. Discovery supports two chosen values and an optional third suggestion; the quick creator still has its two-topping limit.

## Content and scoring

`quiz-en.js` is the English content pack, with stable question, flavor, lens and value IDs. Additional language packs can implement the same schema; Japanese translation is not included. As approved in chat, Matcha represents Harmony instead of adding Mint. The existing ten flavors and ten topping mappings remain available.

`quiz-engine.js` scores Q1–Q3 with one point per flavor. A highest-score tie uses the earliest Q1–Q3 answer among tied flavors. Lens scores use selected count divided by actual opportunities: Words 6, Courage 5, Dialogue 6, Care 6, Youth 5. Sort ties use the documented order Words, Courage, Dialogue, Care, Youth; the top two nonzero lenses are displayed with exact supporting answer quotations. Q8 D is mapped to Youth as specified, although it describes inclusive participation without explicitly mentioning young people; this is flagged for pilot review.

Q11 supplies the participant's two values directly. Suggestion lookup follows primary then alternative lens associations; if both are already chosen, use the first distinct value in the established value-list order. Original values remain recorded and displayed when final choices are customized. Suggestions are optional, replaceable, and removable. Flavor, original expression, selected values, approach, and current action appear in the result; the card contains the final recipe, expression, approach and action. Share opens the device share sheet when available and otherwise copies result text. It does not post automatically.

There are 30 curated actions tagged by value, lens and context. Rank with 6 points for a chosen value, 3 for either leading lens and 2 for an expression-context match; content order settles ties. Match contexts using ordinary words such as family, nature, music and education. Participants can cycle through all actions. This is a deterministic starting library, not interpretation by an AI service.

## State and privacy

Quiz answers, edits and the optional five-point reflection are stored in sessionStorage to support refresh and navigation. No server or analytics request sends responses. Closing the browser session ends this local storage lifecycle. No aggregate dashboard is enabled. The original free creator state remains independent. An optional side-by-side comparison is not included.

## Verification

`tests/quiz-tests.html` runs 66,154 assertions covering all choice mappings, 64 flavor patterns, 16,384 lens patterns, normalization, tie handling, recommendation uniqueness, grounded evidence, original Unicode text and all action tags. It can also be run with Node using a VM context. The renderer's 1,200 three-topping placement plans were checked without failures. Browser QA covers required selections, back/next, editing, third topping, recipe customization, PNG generation and the independent creator. `tests/responsive.html` provides real 390/820/1280-pixel iframe viewports for responsive review when the browser's viewport override is unavailable.

## Pilot with 20–30 participants

Recruit different ages and cultural backgrounds. Observe time from start to result and ask which questions or choices were unclear. Ask whether the result feels meaningful, whether flavor (inner peace) and toppings (values) feel distinct, and whether the approach explanation matches their answers. Observe whether participants customize, try another action or start a conversation. Ask the built-in question “How much does this result feel like you?” on its five-point scale, and ask why.

Record these observations separately with participants' consent; the current local feedback is not a collection system. For a consented pilot dataset, review choice rates below 10% or above 60% as prompts for discussion, not automatic evidence of a bad question. Pay particular attention to Q8 D and whether the Youth lens is understood across ages. Review action feasibility and completion time before an event launch.
