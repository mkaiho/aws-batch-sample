package main

import (
	"context"
	"errors"
	"log"
	"os"
	"sync"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/batch"
	"github.com/aws/aws-sdk-go-v2/service/batch/types"
	"golang.org/x/sync/errgroup"
)

var (
	allJobStatus []types.JobStatus = []types.JobStatus{
		types.JobStatusSubmitted,
		types.JobStatusPending,
		types.JobStatusStarting,
		types.JobStatusRunning,
		types.JobStatusSucceeded,
		types.JobStatusFailed,
	}
)

var (
	initErr  error
	ctx      context.Context
	batchSVC *batch.Client
)

func init() {
	var (
		awsConfig aws.Config
	)
	ctx = context.Background()
	awsConfig, initErr = config.LoadDefaultConfig(ctx)
	batchSVC = batch.NewFromConfig(awsConfig)
}

func main() {
	if initErr != nil {
		log.Fatalf("init error: %s", initErr)
	}

	if !isLocal() {
		lambda.Start(handleRequest)
	} else {
		handleRequest(ctx)
	}
}

func isLocal() bool {
	return len(os.Getenv("AWS_EXECUTION_ENV")) == 0
}

func handleRequest(ctx context.Context) error {
	queues, err := getEnabledQueues(ctx, batchSVC)
	if err != nil {
		return errors.New("failed to get job queues")
	}

	var (
		eg          errgroup.Group
		mu          sync.Mutex
		statusCount = make(map[types.JobStatus]int)
	)
	for _, status := range allJobStatus {
		status := status
		for _, queue := range queues {
			queue := queue
			statusCount[status] = 0
			eg.Go(func() error {
				jobSummaries, err := getJobSummaries(ctx, batchSVC, *queue.JobQueueName, status)
				if err != nil {
					return errors.New("failed to get job summaries")
				}
				mu.Lock()
				statusCount[status] = len(jobSummaries)
				mu.Unlock()
				return nil
			})
		}
	}
	err = eg.Wait()
	if err != nil {
		return err
	}

	for name, count := range statusCount {
		log.Printf("%s: %03d\n", name, count)
	}

	return nil
}

func getEnabledQueues(ctx context.Context, batchSVC *batch.Client) ([]types.JobQueueDetail, error) {
	var (
		next   *string
		queues []types.JobQueueDetail
	)
	for hasNext := true; hasNext; hasNext = next != nil {
		input := batch.DescribeJobQueuesInput{}
		if next != nil {
			input.NextToken = next
		}

		out, err := batchSVC.DescribeJobQueues(ctx, &input)
		if err != nil {
			return nil, err
		}
		for _, queue := range out.JobQueues {
			if queue.State == types.JQStateEnabled {
				queues = append(queues, queue)
			}
		}
		next = out.NextToken
	}

	return queues, nil
}

func getJobSummaries(
	ctx context.Context,
	batchSVC *batch.Client,
	queueName string,
	status types.JobStatus,
) ([]types.JobSummary, error) {
	var (
		next         *string
		jobSummaries []types.JobSummary
	)
	for hasNext := true; hasNext; hasNext = next != nil {
		input := batch.ListJobsInput{
			JobQueue:  &queueName,
			JobStatus: status,
		}
		if next != nil {
			input.NextToken = next
		}

		out, err := batchSVC.ListJobs(ctx, &input)
		if err != nil {
			return nil, err
		}
		jobSummaries = append(jobSummaries, out.JobSummaryList...)
		next = out.NextToken
	}

	return jobSummaries, nil
}
