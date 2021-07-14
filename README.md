# Kaiku ![CI](https://github.com/oamaok/kaiku/actions/workflows/main.yaml/badge.svg)

Lightweight JSX-based UI framework with boilerplate-free state managament.

# Example

```tsx
import { h, render, createState } from 'kaiku'

const state = createState({
  tasks: {
    subTasks: [],
  },
})

const TaskList = ({ parentTask }) => {
  return (
    <div className="todo-list">
      {parentTask.subTasks.map((task) => (
        <TaskItem parentTask={parentTask} task={task} />
      ))}
    </div>
  )
}

const TaskItem = ({ parentTask, task }) => {
  return (
    <div className={['todo-item', { done: task.done }]}>
      <input
        value={task.name}
        onInput={(evt) => {
          task.name = evt.target.value.toUpperCase()
        }}
      />
      <input
        type="checkbox"
        checked={task.done}
        onClick={() => {
          task.done = !task.done
        }}
      />
      <button
        onClick={() => {
          parentTask.subTasks = parentTask.subTasks.filter((t) => t !== task)
        }}
      >
        remove
      </button>
      <button
        onClick={() => {
          task.subTasks.push({
            name: 'New sub task',
            done: false,
            subTasks: [],
          })
        }}
      >
        New sub task
      </button>
      {!!task.subTasks.length && (
        <div className="sub-tasks">
          Sub tasks
          <TaskList parentTask={task} />
        </div>
      )}
    </div>
  )
}

const Summary = () => {
  return <pre>{JSON.stringify(state.tasks, null, 2)}</pre>
}

const TodoApp = () => {
  return (
    <div className="todo-app">
      <button
        onClick={() => {
          state.tasks.subTasks.push({
            name: 'New task',
            done: false,
            subTasks: [],
          })
        }}
      >
        New Task
      </button>
      <button
        onClick={() => {
          state.tasks.subTasks = state.tasks.subTasks.sort(
            (a, b) => a.done - b.done
          )
        }}
      >
        Sort based on done
      </button>
      <TaskList parentTask={state.tasks} />
      <Summary />
    </div>
  )
}

render(<TodoApp />, state, document.body)
```

# License

```
Copyright (c) 2021 Teemu Pääkkönen

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
```
