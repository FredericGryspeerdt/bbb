import { Component, OnInit } from '@angular/core';
import {
  bufferCount,
  filter,
  finalize,
  first,
  interval,
  last,
  lastValueFrom,
  map,
  mapTo,
  Observable,
  of,
  pairwise,
  skip,
  startWith,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  timer,
} from 'rxjs';

interface FrameInterface {
  timer: number;
  description: string;
  state: 'inactive' | 'active' | 'past';
}

interface WorkoutInterface {
  state: 'idle' | 'started' | 'stopped' | 'completed';
  timer: number;
  frames: FrameInterface[];
  activeFrame: number;
  session$: Observable<FrameInterface>;
  elapsedSessions: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  readonly workDuration = 5; // seconds
  readonly breakDuration = 3; // seconds
  readonly numberOfSessions = 3; // seconds

  sessionCount$!: Observable<number>;
  workout!: WorkoutInterface;

  title = 'bbb';

  start$ = new Subject();
  stop$ = new Subject();

  session$!: Observable<FrameInterface>;

  constructor() {}

  ngOnInit(): void {
    const frames = this.generateFrames(
      this.workDuration,
      this.breakDuration,
      this.numberOfSessions
    );

    this.workout = {
      state: 'idle',
      timer: 0,
      elapsedSessions: 0,
      frames,
      activeFrame: -1,
      session$: this.getSession(frames),
    };

    this.sessionCount$ = this.workout.session$.pipe(
      map((frame) => frame.description),
      pairwise(),
      filter(([prev, curr]) => prev === 'work' && curr === 'break'),
      tap((_) => ++this.workout.elapsedSessions),
      map((_) => this.workout.elapsedSessions)
    );
  }

  start() {
    this.start$.next(true);
  }

  stop() {
    this.stop$.next(true);
  }

  private generateFrames(
    workDuration: number,
    breakDuration: number,
    numberOfSessions: number
  ): FrameInterface[] {
    const workSequence = new Array(workDuration)
      .fill(0)
      .map((_, index) => ({ timer: ++index, description: 'work' }));
    const breakSequence = new Array(breakDuration)
      .fill(0)
      .map((_, index) => ({ timer: ++index, description: 'break' }));
    const sessions = new Array(numberOfSessions)
      .fill(0)
      .reduce((sequence, sessionIndex) => {
        sequence.push(...workSequence, ...breakSequence);
        return sequence;
      }, []);

    return sessions;
  }

  private getSession(frames: FrameInterface[]): Observable<FrameInterface> {
    return this.start$.pipe(
      tap((_) => (this.workout.state = 'started')),
      switchMap((_) =>
        interval(1000).pipe(
          // emit every second
          tap((timePassed) => {
            this.workout.timer = timePassed;
          }),
          take(frames.length), // end of session
          map((timePassed) => frames[timePassed]),
          takeUntil(this.stop$), // user stopped session
          finalize(() => (this.workout.state = 'completed'))
        )
      )
    );
  }
}
