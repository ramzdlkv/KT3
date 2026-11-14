import { useState, useEffect } from 'react';
import axios from 'axios';
import { useMutation, useQuery } from '@apollo/client';
import { ALL_TASKS } from './graphql/queries.js';
import { CREATE_TASK, COMPLETE_TASK, DELETE_TASK } from './graphql/mutations.js';

function TaskList() {
  const { loading, error, data } = useQuery(ALL_TASKS);
  const [completeTask, { error: mutationError }] = useMutation(COMPLETE_TASK, {
    refetchQueries: [{ query: ALL_TASKS }],
  });

  const [deleteTask, { error: deleteError}] = useMutation(DELETE_TASK, {
    refetchQueries: [{ query: ALL_TASKS}],
  })

  if (loading) return <p>Загрузка задач...</p>;
  if (error) return <p className="error">Не удалось загрузить задачи: {error.message}</p>;

  const tasks = data?.allTasks ?? [];
  return <section>
    <h2>Список задач</h2>
    {mutationError && <p className="error">Не удалось обновить задачу: {mutationError.message}</p>}
    {deleteError && <p className="error">Не удалось удалить задачу: {deleteError.message}</p>}
    {tasks.length === 0 && <p>Задач пока нет.</p>}
    {tasks.map(task => <article className="task" key={task.id}>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <p>Категория: {task.category?.name ?? '—'} ({task.category?.color ?? '—'})</p>
      <p>Статус: {task.isCompleted ? 'Выполнена' : 'Не выполнена'}</p>
      {!task.isCompleted && <button onClick={() => completeTask({ variables: { taskId: Number(task.id) } })}>Отметить выполненной</button>}
      <button onClick={() => deleteTask({variables: {taskId: Number(task.id) }}).catch(() => {} )}>Удалить</button>
    </article>)}
  </section>;
}
б
function CreateTaskForm() {
  const [title, setTitle] = useState('');
  const [createTask, { loading, error }] = useMutation(CREATE_TASK, {
    refetchQueries: [{ query: ALL_TASKS }],
    onCompleted: () => setTitle(''),
  });

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    createTask({ variables: { title: trimmedTitle } }).catch(() => {});
  }

  return <section className='section1'>
    <h2>Создать задачу</h2>
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Название задачи" minLength={3} required />
      <button disabled={loading}>{loading ? 'Создание...' : 'Добавить'}</button>
    </form>
    {error && <p className="error">Не удалось создать задачу: {error.message}</p>}
  </section>;
}

function UploadImage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
    setProgress(0);
    setThumbnailUrl(null);
    setError('');
  }

  async function handleUpload() {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setProgress(0);
    setThumbnailUrl(null);
    setError('');
    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        onUploadProgress: progressEvent => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        },
      });
      setThumbnailUrl(response.data.thumbnail_url);
    } catch (err) {
      setError(err.response?.data?.detail ?? "Не удалось загрузить фото. Проверьте соединение с сервером" )
    } finally {
      setUploading(false)
    }
  }

  return <section>
    <h2>Загрузка изображения</h2>
    <input type='file' onChange={handleFileChange}></input>
    {previewUrl && !thumbnailUrl && <div>
      <p>Предпросмотр: </p>
      <img className='preview' src={previewUrl} alt='Предпросмотр'/>
    </div>}
    <button onClick={handleUpload} disabled={!file || uploading}>{uploading ? "Загрузка" : "Загрузить"}</button>

    {(uploading || progress > 0) && <p>Прогресс: {progress}%</p>}
    {error && <p className='error'> {error}</p>}
    {thumbnailUrl && <div>
      <p>Миниатюра с сервера: </p>
      <img src={thumbnailUrl} alt='Миниатюра'/>
    </div>}
  </section>;
}

export default function App() {
  return <main>
    <h1>Менеджер задач</h1>
    <CreateTaskForm /><TaskList />
    <UploadImage />
  </main>;
}