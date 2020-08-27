Simple observer that allow watching for property value changes of existing objects

```javascript
import { watch } from '@ski/spy'

let originalObject = { a: 1, b: 2 }

let observable = watch(originalObject)
logChanges(observable)

originalObject.a = 3
originalObject.b = 5
originalObject.c = 1

async function logChanges(stream) {
  for await (const [key, value] of stream) console.log('property', key, 'changed', value)
}
```

will log

- property a changed 3
- property b changed 5
- property c changed 1
