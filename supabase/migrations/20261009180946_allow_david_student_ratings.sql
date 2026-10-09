alter table public.student_topic_ratings
  drop constraint student_topic_ratings_student_id_check;

alter table public.student_topic_ratings
  add constraint student_topic_ratings_student_id_check
  check (student_id in (
    'jay', 'aoife', 'liam', 'saoirse', 'cian', 'emma', 'noah', 'niamh',
    'oisin', 'vladimir', 'masha', 'aarav', 'priya', 'rohan', 'david'
  ));
