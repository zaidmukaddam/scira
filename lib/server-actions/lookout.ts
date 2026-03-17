'use server';

import { serverEnv } from '@/env/server';
import { Client } from '@upstash/qstash';
import { CronExpressionParser } from 'cron-parser';
import {
  createLookout,
  getLookoutsByUserId,
  getLookoutById,
  updateLookout,
  updateLookoutStatus,
  deleteLookout,
} from '@/lib/db/queries';
import { getComprehensiveUserData } from '@/lib/user-data-server';

const qstash = new Client({ token: serverEnv.QSTASH_TOKEN });

const LOOKOUT_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? process.env.NGROK_URL + '/api/lookout'
    : 'https://chat.southerncrossai.com.au/api/lookout';

function frequencyToCron(frequency: string, time: string, timezone: string, dayOfWeek?: string): string {
  const [hours, minutes] = time.split(':').map(Number);

  let cronExpression = '';
  switch (frequency) {
    case 'once':
      return '';
    case 'daily':
      cronExpression = `${minutes} ${hours} * * *`;
      break;
    case 'weekly':
      cronExpression = `${minutes} ${hours} * * ${dayOfWeek || '0'}`;
      break;
    case 'monthly':
      cronExpression = `${minutes} ${hours} 1 * *`;
      break;
    case 'yearly':
      cronExpression = `${minutes} ${hours} 1 1 *`;
      break;
    default:
      cronExpression = `${minutes} ${hours} * * *`;
  }

  return `CRON_TZ=${timezone} ${cronExpression}`;
}

function calculateNextRun(cronSchedule: string, timezone: string): Date {
  try {
    const actualCronExpression = cronSchedule.startsWith('CRON_TZ=')
      ? cronSchedule.split(' ').slice(1).join(' ')
      : cronSchedule;

    const interval = CronExpressionParser.parse(actualCronExpression, {
      currentDate: new Date(),
      tz: timezone,
    });
    return interval.next().toDate();
  } catch (error) {
    console.error('Error parsing cron expression:', cronSchedule, error);
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    return nextRun;
  }
}

function calculateOnceNextRun(time: string, timezone: string, date?: string): Date {
  const [hours, minutes] = time.split(':').map(Number);

  if (date) {
    const targetDate = new Date(date);
    targetDate.setHours(hours, minutes, 0, 0);
    return targetDate;
  }

  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setHours(hours, minutes, 0, 0);

  if (targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  return targetDate;
}

export async function createScheduledLookout({
  title,
  prompt,
  frequency,
  time,
  timezone = 'UTC',
  date,
}: {
  title: string;
  prompt: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  time: string;
  timezone?: string;
  date?: string;
}) {
  try {
    const user = await getComprehensiveUserData();
    if (!user) throw new Error('Authentication required');
    if (!user.isProUser) throw new Error('Pro subscription required for scheduled searches');

    const existingLookouts = await getLookoutsByUserId({ userId: user.id });
    if (existingLookouts.length >= 10) throw new Error('You have reached the maximum limit of 10 lookouts');

    if (frequency === 'daily') {
      const activeDailyLookouts = existingLookouts.filter(
        (l) => l.frequency === 'daily' && l.status === 'active',
      );
      if (activeDailyLookouts.length >= 5) {
        throw new Error('You have reached the maximum limit of 5 active daily lookouts');
      }
    }

    let cronSchedule = '';
    let nextRunAt: Date;
    let actualTime = time;
    let dayOfWeek: string | undefined;

    if (frequency === 'weekly' && time.includes(':')) {
      const parts = time.split(':');
      if (parts.length === 3) {
        actualTime = `${parts[0]}:${parts[1]}`;
        dayOfWeek = parts[2];
      }
    }

    if (frequency === 'once') {
      nextRunAt = calculateOnceNextRun(actualTime, timezone, date);
    } else {
      cronSchedule = frequencyToCron(frequency, actualTime, timezone, dayOfWeek);
      nextRunAt = calculateNextRun(cronSchedule, timezone);
    }

    const lookout = await createLookout({
      userId: user.id,
      title,
      prompt,
      frequency,
      cronSchedule,
      timezone,
      nextRunAt,
      qstashScheduleId: undefined,
    });

    console.log('📝 Created lookout in database:', lookout.id, 'Now scheduling with QStash...');

    await new Promise((resolve) => setTimeout(resolve, 100));

    if (lookout.id) {
      try {
        if (frequency === 'once') {
          console.log('⏰ Creating QStash one-time execution for lookout:', lookout.id);
          const delay = Math.floor((nextRunAt.getTime() - Date.now()) / 1000);
          const minimumDelay = Math.max(delay, 5);

          if (delay > 0) {
            await qstash.publish({
              url: LOOKOUT_BASE_URL,
              body: JSON.stringify({ lookoutId: lookout.id, prompt, userId: user.id }),
              headers: { 'Content-Type': 'application/json' },
              delay: minimumDelay,
            });
            console.log('✅ QStash one-time execution scheduled for lookout:', lookout.id, 'delay:', minimumDelay, 's');
          } else {
            throw new Error('Cannot schedule for a time in the past');
          }
        } else {
          console.log('⏰ Creating QStash recurring schedule for lookout:', lookout.id);
          const scheduleResponse = await qstash.schedules.create({
            destination: LOOKOUT_BASE_URL,
            method: 'POST',
            cron: cronSchedule,
            body: JSON.stringify({ lookoutId: lookout.id, prompt, userId: user.id }),
            headers: { 'Content-Type': 'application/json' },
          });

          console.log('✅ QStash recurring schedule created:', scheduleResponse.scheduleId, 'for lookout:', lookout.id);

          await updateLookout({ id: lookout.id, qstashScheduleId: scheduleResponse.scheduleId });
          lookout.qstashScheduleId = scheduleResponse.scheduleId;
        }
      } catch (qstashError) {
        console.error('Error creating QStash schedule:', qstashError);
        await deleteLookout({ id: lookout.id });
        throw new Error(
          `Failed to ${frequency === 'once' ? 'schedule one-time search' : 'create recurring schedule'}. Please try again.`,
        );
      }
    }

    return { success: true, lookout };
  } catch (error) {
    console.error('Error creating scheduled lookout:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getUserLookouts() {
  try {
    const user = await getComprehensiveUserData();
    if (!user) throw new Error('Authentication required');

    const lookouts = await getLookoutsByUserId({ userId: user.id });

    const updatedLookouts = lookouts.map((lookout) => {
      if (lookout.status === 'active' && lookout.cronSchedule && lookout.frequency !== 'once') {
        try {
          const nextRunAt = calculateNextRun(lookout.cronSchedule, lookout.timezone);
          return { ...lookout, nextRunAt };
        } catch (error) {
          console.error('Error calculating next run for lookout:', lookout.id, error);
          return lookout;
        }
      }
      return lookout;
    });

    return { success: true, lookouts: updatedLookouts };
  } catch (error) {
    console.error('Error getting user lookouts:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateLookoutStatusAction({
  id,
  status,
}: {
  id: string;
  status: 'active' | 'paused' | 'archived' | 'running';
}) {
  try {
    const user = await getComprehensiveUserData();
    if (!user) throw new Error('Authentication required');

    const lookout = await getLookoutById({ id });
    if (!lookout || lookout.userId !== user.id) throw new Error('Lookout not found or access denied');

    if (lookout.qstashScheduleId) {
      try {
        if (status === 'paused') {
          await qstash.schedules.pause({ schedule: lookout.qstashScheduleId });
        } else if (status === 'active') {
          await qstash.schedules.resume({ schedule: lookout.qstashScheduleId });
          if (lookout.cronSchedule) {
            const nextRunAt = calculateNextRun(lookout.cronSchedule, lookout.timezone);
            await updateLookout({ id, nextRunAt });
          }
        } else if (status === 'archived') {
          await qstash.schedules.delete(lookout.qstashScheduleId);
        }
      } catch (qstashError) {
        console.error('Error updating QStash schedule:', qstashError);
      }
    }

    const updatedLookout = await updateLookoutStatus({ id, status });
    return { success: true, lookout: updatedLookout };
  } catch (error) {
    console.error('Error updating lookout status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateLookoutAction({
  id,
  title,
  prompt,
  frequency,
  time,
  timezone,
  dayOfWeek,
}: {
  id: string;
  title: string;
  prompt: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  time: string;
  timezone: string;
  dayOfWeek?: string;
}) {
  try {
    const user = await getComprehensiveUserData();
    if (!user) throw new Error('Authentication required');

    const lookout = await getLookoutById({ id });
    if (!lookout || lookout.userId !== user.id) throw new Error('Lookout not found or access denied');

    if (frequency === 'daily' && lookout.frequency !== 'daily') {
      const existingLookouts = await getLookoutsByUserId({ userId: user.id });
      const activeDailyLookouts = existingLookouts.filter(
        (l) => l.frequency === 'daily' && l.status === 'active' && l.id !== id,
      );
      if (activeDailyLookouts.length >= 5) {
        throw new Error('You have reached the maximum limit of 5 active daily lookouts');
      }
    }

    let cronSchedule = '';
    let nextRunAt: Date;

    if (frequency === 'once') {
      const [hours, minutes] = time.split(':').map(Number);
      const now = new Date();
      nextRunAt = new Date(now);
      nextRunAt.setHours(hours, minutes, 0, 0);
      if (nextRunAt <= now) nextRunAt.setDate(nextRunAt.getDate() + 1);
    } else {
      cronSchedule = frequencyToCron(frequency, time, timezone, dayOfWeek);
      nextRunAt = calculateNextRun(cronSchedule, timezone);
    }

    if (lookout.qstashScheduleId && frequency !== 'once') {
      try {
        await qstash.schedules.delete(lookout.qstashScheduleId);

        console.log('⏰ Recreating QStash schedule for lookout:', id);

        const scheduleResponse = await qstash.schedules.create({
          destination: LOOKOUT_BASE_URL,
          method: 'POST',
          cron: cronSchedule,
          body: JSON.stringify({ lookoutId: id, prompt: prompt.trim(), userId: user.id }),
          headers: { 'Content-Type': 'application/json' },
        });

        const updatedLookout = await updateLookout({
          id,
          title: title.trim(),
          prompt: prompt.trim(),
          frequency,
          cronSchedule,
          timezone,
          nextRunAt,
          qstashScheduleId: scheduleResponse.scheduleId,
        });

        return { success: true, lookout: updatedLookout };
      } catch (qstashError) {
        console.error('Error updating QStash schedule:', qstashError);
        throw new Error('Failed to update schedule. Please try again.');
      }
    } else {
      const updatedLookout = await updateLookout({
        id,
        title: title.trim(),
        prompt: prompt.trim(),
        frequency,
        cronSchedule,
        timezone,
        nextRunAt,
      });

      return { success: true, lookout: updatedLookout };
    }
  } catch (error) {
    console.error('Error updating lookout:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteLookoutAction({ id }: { id: string }) {
  try {
    const user = await getComprehensiveUserData();
    if (!user) throw new Error('Authentication required');

    const lookout = await getLookoutById({ id });
    if (!lookout || lookout.userId !== user.id) throw new Error('Lookout not found or access denied');

    if (lookout.qstashScheduleId) {
      try {
        await qstash.schedules.delete(lookout.qstashScheduleId);
      } catch (error) {
        console.error('Error deleting QStash schedule:', error);
      }
    }

    const deletedLookout = await deleteLookout({ id });
    return { success: true, lookout: deletedLookout };
  } catch (error) {
    console.error('Error deleting lookout:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function testLookoutAction({ id }: { id: string }) {
  try {
    const user = await getComprehensiveUserData();
    if (!user) throw new Error('Authentication required');

    const lookout = await getLookoutById({ id });
    if (!lookout || lookout.userId !== user.id) throw new Error('Lookout not found or access denied');

    if (lookout.status === 'archived' || lookout.status === 'running') {
      throw new Error(`Cannot test lookout with status: ${lookout.status}`);
    }

    const response = await fetch(LOOKOUT_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lookoutId: lookout.id, prompt: lookout.prompt, userId: user.id }),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger lookout test: ${response.statusText}`);
    }

    return { success: true, message: 'Lookout test started successfully' };
  } catch (error) {
    console.error('Error testing lookout:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
