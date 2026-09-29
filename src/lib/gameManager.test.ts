// Run: node --test --test-force-exit src/lib/gameManager.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameManager } from './gameManager.ts';

const settings = { rounds: 2, timePerRound: 60 } as const;

async function makeGame(playerCount = 2) {
  const game = await GameManager.createGame('Host', settings);
  const players = [{ id: game.players[0].id, name: 'Host' }];
  for (let i = 1; i < playerCount; i++) {
    const res = await GameManager.joinGame(game.roomId, `Player${i}`);
    assert.equal(res.success, true);
    players.push({ id: res.player!.id, name: `Player${i}` });
  }
  return { roomId: game.roomId, players };
}

test('createGame makes a waiting room with the host as sole player', async () => {
  const game = await GameManager.createGame('Host', settings);
  assert.equal(game.status, 'waiting');
  assert.equal(game.players.length, 1);
  assert.equal(game.players[0].isHost, true);
});

test('joinGame rejects duplicate names, full rooms, and in-progress games', async () => {
  const { roomId, players } = await makeGame(1);

  const dup = await GameManager.joinGame(roomId, 'Host');
  assert.equal(dup.success, false);
  assert.match(dup.error!, /already taken/i);

  for (let i = 0; i < 7; i++) {
    const res = await GameManager.joinGame(roomId, `Filler${i}`);
    assert.equal(res.success, true);
  }
  const full = await GameManager.joinGame(roomId, 'OneTooMany');
  assert.equal(full.success, false);
  assert.match(full.error!, /full/i);

  await GameManager.startGame(roomId, players[0].id);
  const afterStart = await GameManager.joinGame(roomId, 'TooLate');
  assert.equal(afterStart.success, false);
  assert.match(afterStart.error!, /in progress/i);
});

test('startGame requires the host and at least 2 players', async () => {
  const { roomId, players } = await makeGame(2);

  const notHost = await GameManager.startGame(roomId, players[1].id);
  assert.equal(notHost.success, false);
  assert.match(notHost.error!, /host/i);

  const soloRoom = await GameManager.createGame('Solo', settings);
  const tooFew = await GameManager.startGame(soloRoom.roomId, soloRoom.players[0].id);
  assert.equal(tooFew.success, false);
  assert.match(tooFew.error!, /at least 2/i);

  const ok = await GameManager.startGame(roomId, players[0].id);
  assert.equal(ok.success, true);
  const state = await GameManager.getGame(roomId);
  assert.equal(state!.status, 'word-selection');
  assert.equal(state!.totalTurns, players.length * settings.rounds);
});

test('selectWord enforces phase, drawer identity, and choice bounds', async () => {
  const { roomId, players } = await makeGame(2);
  await GameManager.startGame(roomId, players[0].id);
  const state = await GameManager.getGame(roomId);
  const drawerId = state!.currentDrawer!;
  const otherId = players.find(p => p.id !== drawerId)!.id;

  const wrongPlayer = await GameManager.selectWord(roomId, otherId, 0);
  assert.equal(wrongPlayer.success, false);
  assert.match(wrongPlayer.error!, /only the drawer/i);

  const badIndex = await GameManager.selectWord(roomId, drawerId, 99);
  assert.equal(badIndex.success, false);
  assert.match(badIndex.error!, /invalid/i);

  const ok = await GameManager.selectWord(roomId, drawerId, 0);
  assert.equal(ok.success, true);
  assert.equal(ok.gameState!.status, 'playing');

  const tooLate = await GameManager.selectWord(roomId, drawerId, 0);
  assert.equal(tooLate.success, false);
  assert.match(tooLate.error!, /word selection/i);
});

test('submitGuess scores the guesser and drawer, and blocks the drawer from guessing', async () => {
  const { roomId, players } = await makeGame(2);
  await GameManager.startGame(roomId, players[0].id);
  let state = await GameManager.getGame(roomId);
  const drawerId = state!.currentDrawer!;
  const guesserId = players.find(p => p.id !== drawerId)!.id;
  await GameManager.selectWord(roomId, drawerId, 0);
  state = await GameManager.getGame(roomId);
  const word = state!.currentWord!;

  const drawerGuess = await GameManager.submitGuess(roomId, drawerId, word);
  assert.equal(drawerGuess.success, false);
  assert.match(drawerGuess.error!, /drawer cannot guess/i);

  const wrong = await GameManager.submitGuess(roomId, guesserId, 'not the word');
  assert.equal(wrong.success, true);
  assert.equal(wrong.isCorrect, false);

  const correct = await GameManager.submitGuess(roomId, guesserId, word);
  assert.equal(correct.success, true);
  assert.equal(correct.isCorrect, true);

  const scored = await GameManager.getGame(roomId);
  const guesser = scored!.players.find(p => p.id === guesserId)!;
  const drawer = scored!.players.find(p => p.id === drawerId)!;
  assert.ok(guesser.score > 0);
  assert.ok(drawer.score > 0);
  // Only two players: the one correct guess ends the turn immediately.
  assert.equal(scored!.status, 'round-end');

  const again = await GameManager.submitGuess(roomId, guesserId, word);
  assert.equal(again.success, false);
  assert.match(again.error!, /game not in progress/i);
});

test('leaveGame reassigns host and deletes empty rooms', async () => {
  const { roomId, players } = await makeGame(2);

  const left = await GameManager.leaveGame(roomId, players[0].id);
  assert.equal(left.success, true);
  const state = await GameManager.getGame(roomId);
  assert.equal(state!.players.length, 1);
  assert.equal(state!.players[0].isHost, true);

  await GameManager.leaveGame(roomId, players[1].id);
  const gone = await GameManager.getGame(roomId);
  assert.equal(gone, null);
});

test('handleTimeOut refuses to end a turn before its time is up', async () => {
  const { roomId, players } = await makeGame(2);
  await GameManager.startGame(roomId, players[0].id);
  const state = await GameManager.getGame(roomId);
  await GameManager.selectWord(roomId, state!.currentDrawer!, 0);

  const early = await GameManager.handleTimeOut(roomId);
  assert.equal(early.success, false);
  assert.match(early.error!, /not timed out/i);
});
