/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexField } from '../../../../common/search_strategy/index_fields';
import { getBrowserFields, useIndexFields } from '.';
import { mockBrowserFields, mocksSource } from './mock';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { createStore, State } from '../../store';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../mock';
import { act, renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import React from 'react';
import { useKibana } from '../../lib/kibana';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../lib/kibana'); // , () => ({

describe('source/index.tsx', () => {
  describe('getBrowserFields', () => {
    test('it returns an empty object given an empty array', () => {
      const fields = getBrowserFields('title 1', []);
      expect(fields).toEqual({});
    });

    test('it returns the same input with the same title', () => {
      getBrowserFields('title 1', []);
      // Since it is memoized it will return the same output which is empty object given 'title 1' a second time
      const fields = getBrowserFields('title 1', mocksSource.indexFields as IndexField[]);
      expect(fields).toEqual({});
    });

    test('it transforms input into output as expected', () => {
      const fields = getBrowserFields('title 2', mocksSource.indexFields as IndexField[]);
      expect(fields).toEqual(mockBrowserFields);
    });
  });
  describe('useIndexFields hook', () => {
    const sourcererState = mockGlobalState.sourcerer;
    const state: State = {
      ...mockGlobalState,
      sourcerer: {
        ...sourcererState,
        kibanaDataViews: [
          ...sourcererState.kibanaDataViews,
          {
            id: 'something-random',
            title: 'something,random',
            patternList: ['something', 'random'],
          },
        ],
        sourcererScopes: {
          ...sourcererState.sourcererScopes,
          [SourcererScopeName.default]: {
            ...sourcererState.sourcererScopes[SourcererScopeName.default],
            indexPattern: {
              fields: [],
              title: '',
            },
          },
          [SourcererScopeName.detections]: {
            ...sourcererState.sourcererScopes[SourcererScopeName.detections],
            indexPattern: {
              fields: [],
              title: '',
            },
          },
          [SourcererScopeName.timeline]: {
            ...sourcererState.sourcererScopes[SourcererScopeName.timeline],
            indexPattern: {
              fields: [],
              title: '',
            },
          },
        },
      },
    };
    const mockSearchResponse = {
      ...mocksSource,
      indicesExist: ['auditbeat-*', sourcererState.signalIndexName],
      isRestore: false,
      rawResponse: {},
      runtimeMappings: {},
    };
    const { storage } = createSecuritySolutionStorageMock();
    let store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

    beforeEach(() => {
      jest.clearAllMocks();
      const mock = {
        subscribe: ({ next }: { next: Function }) => next(mockSearchResponse),
        unsubscribe: jest.fn(),
      };

      (useKibana as jest.Mock).mockReturnValue({
        services: {
          data: {
            search: {
              search: jest.fn().mockReturnValue({
                subscribe: ({ next }: { next: Function }) => {
                  next(mockSearchResponse);
                  return mock;
                },
                unsubscribe: jest.fn(),
              }),
            },
          },
        },
      });
    });
    it('sets source for default scope', async () => {
      await act(async () => {
        const { rerender, waitForNextUpdate } = renderHook<string, void>(
          () => useIndexFields(SourcererScopeName.default),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        rerender();
        expect(mockDispatch.mock.calls[0][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
          payload: { id: SourcererScopeName.default, loading: true },
        });
        const {
          type: sourceType,
          payload: { payload },
        } = mockDispatch.mock.calls[1][0];
        expect(sourceType).toEqual('x-pack/security_solution/local/sourcerer/SET_SOURCE');
        expect(payload.id).toEqual(SourcererScopeName.default);
        expect(payload.indicesExist).toEqual(true);
        expect(payload.indexPattern.title).toEqual(
          'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*'
        );
      });
    });

    it('sets source for detections scope', async () => {
      await act(async () => {
        const { rerender, waitForNextUpdate } = renderHook<string, void>(
          () => useIndexFields(SourcererScopeName.detections),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        rerender();
        expect(mockDispatch.mock.calls[0][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
          payload: { id: SourcererScopeName.detections, loading: true },
        });
        const {
          type: sourceType,
          payload: { payload },
        } = mockDispatch.mock.calls[1][0];
        expect(sourceType).toEqual('x-pack/security_solution/local/sourcerer/SET_SOURCE');
        expect(payload.id).toEqual(SourcererScopeName.detections);
        expect(payload.indicesExist).toEqual(true);
        expect(payload.indexPattern.title).toEqual(sourcererState.signalIndexName);
      });
    });
    it('sets source for timelines scope', async () => {
      await act(async () => {
        const { rerender, waitForNextUpdate } = renderHook<string, void>(
          () => useIndexFields(SourcererScopeName.timeline),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        rerender();
        expect(mockDispatch.mock.calls[0][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
          payload: { id: SourcererScopeName.timeline, loading: true },
        });
        const {
          type: sourceType,
          payload: { payload },
        } = mockDispatch.mock.calls[1][0];
        expect(sourceType).toEqual('x-pack/security_solution/local/sourcerer/SET_SOURCE');
        expect(payload.id).toEqual(SourcererScopeName.timeline);
        expect(payload.indicesExist).toEqual(true);
        expect(payload.indexPattern.title).toEqual(
          `${sourcererState.signalIndexName},apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*`
        );
      });
    });
    it('sets source for detections scope when signalIndexName is updated', async () => {
      store = createStore(
        { ...state, sourcerer: { ...state.sourcerer, signalIndexName: null } },
        SUB_PLUGINS_REDUCER,
        kibanaObservable,
        storage
      );
      await act(async () => {
        const { result, rerender, waitForNextUpdate } = renderHook<
          string,
          { indexFieldsSearch: (selectedDataViewId: string, newSignalsIndex?: string) => void }
        >(() => useIndexFields(SourcererScopeName.detections), {
          wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
        });
        await waitForNextUpdate();
        rerender();
        act(() => {
          result.current.indexFieldsSearch(
            sourcererState.defaultDataView.id,
            `${sourcererState.signalIndexName}`
          );
        });

        expect(mockDispatch.mock.calls[0][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
          payload: { id: SourcererScopeName.detections, loading: true },
        });
        expect(mockDispatch.mock.calls[1][0].payload.payload.indicesExist).toEqual(false);
        expect(mockDispatch.mock.calls[2][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
          payload: { id: SourcererScopeName.detections, loading: true },
        });
        expect(mockDispatch.mock.calls[3][0].payload.payload.indicesExist).toEqual(true);
      });
    });
    it('when selectedPatterns=[], defaults to the patternList of the selected dataView', async () => {
      await act(async () => {
        store = createStore(
          {
            ...state,
            sourcerer: {
              ...state.sourcerer,
              sourcererScopes: {
                ...state.sourcerer.sourcererScopes,
                [SourcererScopeName.default]: {
                  ...state.sourcerer.sourcererScopes[SourcererScopeName.default],
                  selectedDataViewId: 'something-random',
                  selectedPatterns: [],
                },
              },
            },
          },
          SUB_PLUGINS_REDUCER,
          kibanaObservable,
          storage
        );
        const { rerender, waitForNextUpdate } = renderHook<string, void>(
          () => useIndexFields(SourcererScopeName.default),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        rerender();
        expect(mockDispatch.mock.calls[0][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
          payload: { id: SourcererScopeName.default, loading: true },
        });
        const {
          type: sourceType,
          payload: { payload },
        } = mockDispatch.mock.calls[1][0];
        expect(sourceType).toEqual('x-pack/security_solution/local/sourcerer/SET_SOURCE');
        expect(payload.id).toEqual(SourcererScopeName.default);
        expect(payload.indicesExist).toEqual(true);
        expect(payload.indexPattern.title).toEqual('random,something');
      });
    });
    it('when selectedPatterns=[] and selectedDataViewId=security-solution, runs getScopePatternListSelection', async () => {
      await act(async () => {
        store = createStore(
          {
            ...state,
            sourcerer: {
              ...state.sourcerer,
              sourcererScopes: {
                ...state.sourcerer.sourcererScopes,
                [SourcererScopeName.default]: {
                  ...state.sourcerer.sourcererScopes[SourcererScopeName.default],
                  selectedPatterns: [],
                },
              },
            },
          },
          SUB_PLUGINS_REDUCER,
          kibanaObservable,
          storage
        );
        const { rerender, waitForNextUpdate } = renderHook<string, void>(
          () => useIndexFields(SourcererScopeName.default),
          {
            wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
          }
        );
        await waitForNextUpdate();
        rerender();
        expect(mockDispatch.mock.calls[0][0]).toEqual({
          type: 'x-pack/security_solution/local/sourcerer/SET_SOURCERER_SCOPE_LOADING',
          payload: { id: SourcererScopeName.default, loading: true },
        });
        const {
          type: sourceType,
          payload: { payload },
        } = mockDispatch.mock.calls[1][0];
        expect(sourceType).toEqual('x-pack/security_solution/local/sourcerer/SET_SOURCE');
        expect(payload.id).toEqual(SourcererScopeName.default);
        expect(payload.indicesExist).toEqual(true);
        expect(payload.indexPattern.title).toEqual(
          'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*'
        );
      });
    });
  });
});
