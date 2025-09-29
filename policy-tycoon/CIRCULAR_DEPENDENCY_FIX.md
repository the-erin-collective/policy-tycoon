# Circular Dependency Fix

## Problem

We encountered a "Maximum call stack size exceeded" error caused by a circular dependency between [RoadNetworkBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/road-network-builder.service.ts#L25-L855) and [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256):

```
ERROR RangeError: Maximum call stack size exceeded
    at new _RoadNetworkBuilderService (road-network-builder.service.ts:56:33)
    at new _RecursiveRoadBuilderService (recursive-road-builder.service.ts:36:5)
    at new _RoadNetworkBuilderService (road-network-builder.service.ts:56:33)
    at new _RecursiveRoadBuilderService (recursive-road-builder.service.ts:36:5)
    ...
```

## Root Cause

The issue was caused by our initial attempt to fix the road generation by creating a new instance of [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256) inside [RoadNetworkBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/road-network-builder.service.ts#L25-L855). This created an infinite loop because:

1. [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256) extends [RoadNetworkBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/road-network-builder.service.ts#L25-L855)
2. When we tried to create a new [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256) inside [RoadNetworkBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/road-network-builder.service.ts#L25-L855), it would call the [RoadNetworkBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/road-network-builder.service.ts#L25-L855) constructor
3. The [RoadNetworkBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/road-network-builder.service.ts#L25-L855) constructor would try to create another [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256)
4. This would continue infinitely, causing a stack overflow

## Solution

We fixed the circular dependency by:

1. **Removing the circular import and instantiation**: Removed the import and instantiation of [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256) from [RoadNetworkBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/road-network-builder.service.ts#L25-L855)

2. **Using dependency injection properly**: Modified [ClassicCityGeneratorService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/classic-city-generator.service.ts#L27-L516) to directly inject and use [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256) instead of the base [RoadNetworkBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/road-network-builder.service.ts#L25-L855)

## Changes Made

### 1. RoadNetworkBuilderService ([road-network-builder.service.ts](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/road-network-builder.service.ts))

- Removed import of [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256)
- Removed instantiation of [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256) in the constructor
- Kept the base implementation intact

### 2. ClassicCityGeneratorService ([classic-city-generator.service.ts](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/classic-city-generator.service.ts))

- Updated the constructor to directly inject [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256)
- Updated the import statement to import [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256) directly

## How It Works Now

1. [ClassicCityGeneratorService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/classic-city-generator.service.ts#L27-L516) directly uses [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256) for road generation
2. [RecursiveRoadBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/recursive-road-builder.service.ts#L27-L256) extends [RoadNetworkBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/road-network-builder.service.ts#L25-L855) and overrides methods to provide recursive road generation
3. [RoadNetworkBuilderService](file:///d:/dev/github/policy-tycoon/github/policy-tycoon/src/app/application/services/road-network-builder.service.ts#L25-L855) remains as a base service without any circular dependencies

## Benefits

- Eliminates the circular dependency and stack overflow error
- Maintains the intended functionality of using recursive road generation
- Follows Angular's dependency injection patterns correctly
- Preserves all the previous fixes for city placement, road generation, and building placement

## Verification

The fix has been verified to:
- Compile without syntax errors
- Eliminate the "Maximum call stack size exceeded" error
- Maintain all the functionality of the recursive road generation