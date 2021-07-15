import { h, render, createState } from 'kaiku'

const state = createState({
  tasks: {
    subTasks: [],
  },
})

const addNewSubTask = (task) => {
  task.subTasks.push({
    key: Math.random().toString(36),
    name:
      '#' + (task.subTasks.length + 1) + (task.name ? ' of ' + task.name : ''),
    done: false,
    subTasks: [],
  })
}

const TaskList = ({ parentTask }) => {
  return (
    <div className="todo-list">
      {parentTask.subTasks.map((task, i) => (
        <TaskItem
          key={task.key}
          index={i}
          parentTask={parentTask}
          task={task}
        />
      ))}
    </div>
  )
}

const TaskItem = ({ parentTask, index, task }) => {
  const canMoveUp = index !== 0
  const canMoveDown = index !== parentTask.subTasks.length - 1

  return (
    <div className={() => ['todo-item', { done: task.done }]}>
      <div className="item-controls">
        {canMoveUp && (
          <button
            onClick={() => {
              const tmp = parentTask.subTasks[index - 1]
              parentTask.subTasks[index - 1] = task
              parentTask.subTasks[index] = tmp
            }}
          >
            ^
          </button>
        )}
        {canMoveDown && (
          <button
            onClick={() => {
              const tmp = parentTask.subTasks[index + 1]
              parentTask.subTasks[index + 1] = task
              parentTask.subTasks[index] = tmp
            }}
          >
            v
          </button>
        )}
        <input
          value={() => task.name}
          onInput={(evt) => {
            task.name = evt.target.value.toUpperCase()
          }}
        />
        Done:
        <input
          type="checkbox"
          checked={() => task.done}
          onClick={() => {
            task.done = !task.done
          }}
        />
        <button
          onClick={() => {
            parentTask.subTasks = parentTask.subTasks.filter((t) => t !== task)
          }}
        >
          X
        </button>
        <button
          onClick={() => {
            addNewSubTask(task)
          }}
        >
          New sub task
        </button>
      </div>
      {!!task.subTasks.length && (
        <div className="sub-tasks">
          <TaskList parentTask={task} />
        </div>
      )}
    </div>
  )
}

const TodoApp = () => {
  return (
    <div className="todo-app">
      <button
        onClick={() => {
          addNewSubTask(state.tasks)
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
    </div>
  )
}

render(<TodoApp />, state, document.body)
