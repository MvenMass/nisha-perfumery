import { useRef } from 'react';

import { useUploadContentImage } from '../../features/admin/content-api';
import { ApiError } from '../../shared/api/http';
import { Button } from '../../shared/ui/Button/Button';
import styles from './Admin.module.css';
import imageStyles from './ImagesManager.module.css';

type ImageUploadFieldProps = {
  label: string;
  url: string | null;
  onChange: (url: string | null) => void;
};

/** Снимок слайда или обложки: файл уходит на сервер сразу, в форму попадает его адрес. */
export function ImageUploadField({ label, url, onChange }: ImageUploadFieldProps) {
  const upload = useUploadContentImage();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className={imageStyles.item}>
      {url ? (
        <img src={url} alt="" className={imageStyles.preview} />
      ) : (
        <p className={styles.muted}>Снимка нет — на витрине будет фон.</p>
      )}
      <label className={imageStyles.file}>
        <span>{label}</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload.mutate(file, { onSuccess: (uploaded) => onChange(uploaded) });
          }}
        />
      </label>
      {upload.isPending && <p className={styles.ok}>Загружаем…</p>}
      {upload.isError && (
        <p role="alert" className={styles.error}>
          {upload.error instanceof ApiError ? upload.error.message : 'Не получилось загрузить'}
        </p>
      )}
      {url && (
        <div>
          <Button
            variant="link"
            size="md"
            onClick={() => {
              onChange(null);
              if (fileRef.current) fileRef.current.value = '';
            }}
          >
            Убрать снимок
          </Button>
        </div>
      )}
    </div>
  );
}
