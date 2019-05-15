import React, { useState, useEffect, useReducer } from 'react';
import { Async } from 'crocks';
import propPath from 'crocks/Maybe/propPath';
import prop from 'crocks/Maybe/prop';
import compose from 'crocks/helpers/compose'
import pipe from 'crocks/helpers/pipe'
import composeK from 'crocks/helpers/composeK'
import ReaderT from 'crocks/Reader/ReaderT'
import nAry from 'crocks/helpers/nAry'
import Reader from 'crocks/Reader'
import Either from 'crocks/Either'
import maybeToEither from 'crocks/Either/maybeToEither'
import identity from 'crocks/Identity'

const { Left, Right } = Either;

const env = {
  base: "http://api.apixu.com/v1/current.json",
  key: "360dcc96055b410d98f204618191305"
}

const generateUrl = env => query => `${env.base}?key=${env.key}&q=${query}`
const baseUrl = generateUrl(env)

// fetchJson :: String -> Promise e a
const fetchJson = url => fetch(url).then(res => res.json());
// fetchAsync :: String -> Async e a
const fetchAsync = Async.fromPromise(fetchJson);

// safeLocationName :: a -> Maybe String
const safeLocationName = propPath(["location", "name"])
const safeCurrentData = prop("current")
const safeCurrentTempC = composeK(prop("temp_c"), safeCurrentData)
const safeCurrentTempF = composeK(prop("temp_f"), safeCurrentData)
const safeCurrentTemp = measurment => {
  switch (measurment) {
    case "C":
      return safeCurrentTempC;
    case "F":
      return safeCurrentTempF;
    default:
      return safeCurrentTempC;
  }
}

function useFetchAsync(url) {
  const [result, setResult] = useState(Right({}));

  const setErrorResult = pipe(Left, setResult)
  const setValidResult = pipe(Right, setResult)

  useEffect(() => {
    fetchAsync(url).fork(setErrorResult, setValidResult)
  }, [url]);
  return result;
}

// Either e a -> (a -> Maybe a, e -> Component b, a -> Component b) -> Component b | Component b
const extract = data => (safeFn, lFn = e => e, rFn = a => a) => data.chain(compose(maybeToEither("Loading"), safeFn)).either(lFn, rFn)

const initialState = {
  cityName: "Belgrade",
  url: baseUrl("Belgrade"),
  measurment: "C"
}

// actions
const setCityName = (cityName) => ({ type: "SET_CITY_NAME", payload: cityName })
const setUrl = (url) => ({ type: "SET_URL", payload: url })
const setMeasurment = (measurment) => ({ type: "SET_MEASURMENT", payload: measurment })

// reducer
const reducer = (state = initialState, action) => {
  const { type, payload } = action
  switch (type) {
    case "SET_CITY_NAME":
      return {
        ...state,
        cityName: payload
      }
    case "SET_URL":
      return {
        ...state,
        url: payload
      }
    case "SET_MEASURMENT":
      return {
        ...state,
        measurment: payload
      }

    default:
      return state;
  }
}

export default function Search(props) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { cityName, url, measurment } = state;
  const setQuery = compose(setUrl, baseUrl);
  const result = useFetchAsync(url);
  const extractResult = extract(result);

  return (
    <div>
      {extractResult(
        safeLocationName,
        e => <p>{e !== "Loading" ? "An unexpected error happened" : e}</p>,
        a => <p>Weather in {a}</p>
      )}
      <br />
      {extractResult(
        safeCurrentTemp(measurment),
        e => <div />,
        a => <h1>{a} {measurment} </h1>
      )}
      <input type="radio" onChange={e => dispatch(setMeasurment(e.target.value))} name="measurment" value="C" /> C<br />
      <input type="radio" onChange={e => dispatch(setMeasurment(e.target.value))} name="measurment" value="F" /> F<br />
      <br />
      <input onChange={e => dispatch(setCityName(e.target.value))} />
      <button onClick={() => dispatch(setQuery(cityName))}>Search</button>
    </div>
  )
}