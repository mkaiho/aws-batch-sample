# aws-batch-sample

## Deploy

```.sh
cd _deployments/cdk; cdk -c env=stage deploy; cd ../..;
```

## Run batch

```.sh
aws batch submit-job \
  --job-name "aws-batch-sample" \
  --job-queue "aws-batch-sample" \
  --job-definition "aws-batch-sample"
```

## Destroy

```.sh
cd _deployments/cdk; cdk -c env=stage destroy; cd ../..;
```
