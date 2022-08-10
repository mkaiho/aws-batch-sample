# aws-batch-sample

## Common

### Deploy all

```
cd _deployments/cdk; cdk --all -c env=stage deploy; cd ../..;
```

### Destroy all

```
cd _deployments/cdk; cdk --all -c env=stage destroy; cd ../..;
```

## aws-batch-sample

### Deploy

```.sh
cd _deployments/cdk; cdk -c env=stage deploy AwsBatchSampleStack; cd ../..;
```

### Destroy

```.sh
cd _deployments/cdk; cdk -c env=stage destroy AwsBatchSampleStack; cd ../..;
```

### Run batch

```.sh
aws batch submit-job \
  --job-name "aws-batch-sample" \
  --job-queue "aws-batch-sample" \
  --job-definition "aws-batch-sample"
```

## job-status-observer

### Deploy

```.sh
cd _deployments/cdk; cdk -c env=stage deploy JobStatusObserverStack; cd ../..;
```

### Destroy

```.sh
cd _deployments/cdk; cdk -c env=stage destroy JobStatusObserverStack; cd ../..;
```

### Run function

```.sh
aws lambda invoke \
    --function-name job-status-observer-lambda \
    response.json
```
