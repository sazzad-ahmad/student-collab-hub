-- ============================================================
-- DATABASE: student_collab_hub
-- ============================================================
CREATE DATABASE IF NOT EXISTS `student_collab_hub`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `student_collab_hub`;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE `users` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email`           VARCHAR(255)    NOT NULL,
  `password_hash`   VARCHAR(255)    NOT NULL,
  `full_name`       VARCHAR(150)    NOT NULL,
  `role`            ENUM('student','team_lead') NOT NULL DEFAULT 'student',
  `avatar_url`      VARCHAR(500)    NULL,
  `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB;

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE `projects` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`            VARCHAR(200)    NOT NULL,
  `description`     TEXT            NULL,
  `owner_id`        BIGINT UNSIGNED NOT NULL,
  `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_projects_owner` (`owner_id`),
  CONSTRAINT `fk_projects_owner`
    FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- PROJECT MEMBERS (many-to-many: users <-> projects)
-- ============================================================
CREATE TABLE `project_members` (
  `project_id`      BIGINT UNSIGNED NOT NULL,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `role_in_project` ENUM('member','lead') NOT NULL DEFAULT 'member',
  `joined_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`project_id`, `user_id`),
  KEY `idx_pm_user` (`user_id`),
  CONSTRAINT `fk_pm_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_pm_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE `tasks` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id`      BIGINT UNSIGNED NOT NULL,
  `title`           VARCHAR(255)    NOT NULL,
  `description`     TEXT            NULL,
  `status`          ENUM('todo','in_progress','done') NOT NULL DEFAULT 'todo',
  `priority`        ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `assignee_id`     BIGINT UNSIGNED NULL,
  `reporter_id`     BIGINT UNSIGNED NOT NULL,
  `due_date`        DATE            NULL,
  `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_project` (`project_id`),
  KEY `idx_tasks_assignee` (`assignee_id`),
  KEY `idx_tasks_status` (`status`),
  KEY `idx_tasks_priority` (`priority`),
  KEY `idx_tasks_due_date` (`due_date`),
  CONSTRAINT `fk_tasks_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_assignee`
    FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_reporter`
    FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- TASK COMMENTS / ACTIVITY LOG
-- ============================================================
CREATE TABLE `task_comments` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id`         BIGINT UNSIGNED NOT NULL,
  `user_id`         BIGINT UNSIGNED NOT NULL,
  `content`         TEXT            NOT NULL,
  `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tc_task` (`task_id`),
  KEY `idx_tc_user` (`user_id`),
  CONSTRAINT `fk_tc_task`
    FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_tc_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- SESSIONS (for express-session with MySQL store)
-- ============================================================
CREATE TABLE `sessions` (
  `session_id`      VARCHAR(128)    NOT NULL,
  `expires`         BIGINT UNSIGNED NOT NULL,
  `data`            MEDIUMTEXT      NULL,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB;